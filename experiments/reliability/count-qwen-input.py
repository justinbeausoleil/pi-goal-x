"""Offline text-only prompt count using the installed MLX server's formatting path.
Run with the existing mlx-vlm uv tool interpreter; never loads model weights.
"""
import json
import sys
from pathlib import Path
# Model loading normally registers MLX's NumPy processor. Register it without weights.
import mlx_vlm.models.qwen3_5_moe  # noqa: F401
from mlx_vlm.prompt_utils import apply_chat_template, extract_text_from_content
from mlx_vlm.utils import load_processor, prepare_inputs
from mlx_vlm.server.schemas import ChatRequest
from mlx_vlm.server.request_normalization import _build_gen_args
from mlx_vlm.server.openai import _prepare_chat_tool_choice

body = json.load(sys.stdin)
assert body["model"] == "mlx-community/Qwen3.6-35B-A3B-8bit"
assert body["max_tokens"] == 256 and body["enable_thinking"] is False
snapshot = Path.home() / ".cache/huggingface/hub/models--mlx-community--Qwen3.6-35B-A3B-8bit/snapshots/e06a74e6236a60c8367e1a3214e83d8b61b637b0"
processor = load_processor(snapshot, local_files_only=True, trust_remote_code=False)
request = ChatRequest.model_validate(body)
messages = []
for message in request.messages:
    if isinstance(message.content, list):
        assert all(part.get("type") == "text" for part in message.content), "text-only probe"
    item = {"role": message.role, "content": extract_text_from_content(message.content)}
    if message.tool_calls is not None:
        item["tool_calls"] = message.tool_calls
        for call in item["tool_calls"]:
            args = call["function"].get("arguments", {})
            if isinstance(args, str):
                call["function"]["arguments"] = json.loads(args)
    for name in ("tool_call_id", "name", "reasoning_content"):
        value = getattr(message, name, None)
        if value is not None:
            item[name] = value
    if "reasoning_content" in item:
        item["reasoning"] = item["reasoning_content"]
    messages.append(item)
messages, tools, choice = _prepare_chat_tool_choice(messages, request.tools, request.tool_choice)
args = _build_gen_args(request, processor)
assert args.max_tokens == 256 and args.enable_thinking is False
kwargs = args.to_template_kwargs()
if choice is not None:
    kwargs["tool_choice"] = choice
prompt = apply_chat_template(processor, json.loads((snapshot / "config.json").read_text()), messages, tools=tools, **kwargs)
inputs = prepare_inputs(processor, prompts=prompt, add_special_tokens=False)
print(json.dumps({"inputTokens": int(inputs["input_ids"].size), "maxOutput": args.max_tokens, "thinking": args.enable_thinking}))
