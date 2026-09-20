import argparse
import json
import mimetypes
import os
import sys
import time
import uuid
from pathlib import Path
from urllib import error, request


BASE_URL = "https://openapi.tripo3d.ai/v3"
MODEL = "v3.1-20260211"

DEFAULT_FRONT = Path("assets/character/3d/nexia/reference/front.png")
DEFAULT_BACK = Path("assets/character/3d/nexia/reference/back.png")
DEFAULT_LEFT = Path("assets/character/3d/nexia/reference/left.png")
DEFAULT_OUTPUT = Path("assets/character/3d/nexia/ai/tripo-multiview.glb")


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Validate and optionally run a single Tripo H3.1 multiview generation "
            "for Nexia without requiring a monthly Tripo plan."
        )
    )
    parser.add_argument("--front", type=Path, default=DEFAULT_FRONT)
    parser.add_argument("--back", type=Path, default=DEFAULT_BACK)
    parser.add_argument("--left", type=Path, default=DEFAULT_LEFT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--with-texture",
        action="store_true",
        help=(
            "Generate standard PBR textures too. "
            "Default is geometry-only to minimize credits."
        ),
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help=(
            "Actually upload images and create the paid generation task. "
            "Without this flag, only validation and balance check are performed."
        ),
    )
    parser.add_argument(
        "--poll-seconds",
        type=float,
        default=5.0,
        help="Polling interval for async task status.",
    )
    parser.add_argument(
        "--timeout-minutes",
        type=float,
        default=15.0,
        help="Maximum wait time for generation.",
    )
    return parser.parse_args()


def api_key():
    value = os.environ.get("TRIPO_API_KEY", "").strip()
    if not value:
        raise RuntimeError(
            "TRIPO_API_KEY is not set. "
            'PowerShell example: $env:TRIPO_API_KEY="your_api_key"'
        )
    return value


def auth_headers():
    return {
        "Authorization": f"Bearer {api_key()}",
        "User-Agent": "BattleNetwork-Nexia-Tripo-Test/1.0",
    }


def decode_json_response(response):
    raw = response.read().decode("utf-8")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Tripo returned invalid JSON: {raw[:500]}") from exc

    if payload.get("code") != 0:
        raise RuntimeError(
            "Tripo API error: "
            f"code={payload.get('code')} "
            f"message={payload.get('message')} "
            f"suggestion={payload.get('suggestion')}"
        )
    return payload


def api_request(method, path, body=None, headers=None, timeout=120):
    final_headers = auth_headers()
    if headers:
        final_headers.update(headers)

    req = request.Request(
        BASE_URL + path,
        data=body,
        method=method,
        headers=final_headers,
    )

    try:
        with request.urlopen(req, timeout=timeout) as response:
            return decode_json_response(response)
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Tripo HTTP {exc.code} for {path}: {detail[:1000]}"
        ) from exc
    except error.URLError as exc:
        raise RuntimeError(f"Network error calling Tripo: {exc}") from exc


def get_balance():
    payload = api_request("GET", "/account/balance")
    return payload["data"]


def ensure_inputs(paths):
    for label, path in paths.items():
        if not path.is_file():
            raise FileNotFoundError(f"{label} image not found: {path}")
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            raise RuntimeError(
                f"{label} image must be PNG/JPEG/WebP for Tripo: {path}"
            )
        if path.stat().st_size > 20 * 1024 * 1024:
            raise RuntimeError(f"{label} image exceeds Tripo 20 MB limit: {path}")


def build_multipart_file(path):
    boundary = "----BattleNetwork" + uuid.uuid4().hex
    filename = path.name
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(
        (
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        ).encode()
    )
    body.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
    body.extend(path.read_bytes())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    return bytes(body), f"multipart/form-data; boundary={boundary}"


def upload_file(path):
    body, content_type = build_multipart_file(path)
    payload = api_request(
        "POST",
        "/files",
        body=body,
        headers={
            "Content-Type": content_type,
            "Content-Length": str(len(body)),
        },
        timeout=180,
    )
    token = payload["data"].get("file_token")
    if not token:
        raise RuntimeError(f"Upload response did not include file_token for {path}")
    return token


def create_multiview_task(tokens, with_texture):
    body_data = {
        "inputs": [
            {"front": tokens["front"]},
            {"left": tokens["left"]},
            {"back": tokens["back"]},
        ],
        "model": MODEL,
        "texture": bool(with_texture),
        "pbr": bool(with_texture),
        "geometry_quality": "standard",
    }
    if with_texture:
        body_data["texture_quality"] = "standard"

    body = json.dumps(body_data).encode("utf-8")
    payload = api_request(
        "POST",
        "/generation/multiview-to-model",
        body=body,
        headers={"Content-Type": "application/json"},
        timeout=180,
    )

    task_id = payload["data"].get("task_id")
    if not task_id:
        raise RuntimeError("Generation response did not include task_id.")
    return task_id


def poll_task(task_id, poll_seconds, timeout_minutes):
    deadline = time.monotonic() + timeout_minutes * 60.0
    last_progress = None

    while True:
        if time.monotonic() > deadline:
            raise TimeoutError(
                f"Tripo task {task_id} did not finish within {timeout_minutes} minutes."
            )

        payload = api_request("GET", f"/tasks/{task_id}")
        data = payload["data"]
        status = data.get("status")
        progress = data.get("progress")

        if progress != last_progress:
            print(f"Task status: {status} / {progress}%")
            last_progress = progress

        if status == "success":
            return data
        if status in {"failed", "cancelled"}:
            raise RuntimeError(
                f"Tripo task ended with status={status}, "
                f"error_code={data.get('error_code')}, "
                f"error_message={data.get('error_message')}"
            )

        time.sleep(max(1.0, poll_seconds))


def download_file(url, output_path):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    req = request.Request(
        url,
        headers={"User-Agent": "BattleNetwork-Nexia-Tripo-Test/1.0"},
    )
    try:
        with request.urlopen(req, timeout=300) as response:
            output_path.write_bytes(response.read())
    except error.URLError as exc:
        raise RuntimeError(f"Failed to download generated model: {exc}") from exc


def main():
    args = parse_args()

    inputs = {
        "front": args.front.resolve(),
        "back": args.back.resolve(),
        "left": args.left.resolve(),
    }
    ensure_inputs(inputs)

    expected_credits = 30 if args.with_texture else 20

    balance = get_balance()
    available = float(balance.get("balance", 0.0))
    frozen = float(balance.get("frozen", 0.0))

    print("TRIPO_NEXIA_PREFLIGHT_OK")
    print(f"Model: {MODEL}")
    print("Views: front / left / back")
    print(f"Front: {inputs['front']}")
    print(f"Left: {inputs['left']}")
    print(f"Back: {inputs['back']}")
    print(f"Texture: {'standard PBR' if args.with_texture else 'OFF'}")
    print(f"Expected base generation cost: {expected_credits} credits")
    print(f"Available credits: {available:.2f}")
    print(f"Frozen credits: {frozen:.2f}")

    if available < expected_credits:
        raise RuntimeError(
            f"Insufficient available credits for this test. "
            f"Need at least {expected_credits}, have {available:.2f}."
        )

    if not args.execute:
        print("")
        print("DRY_RUN_ONLY")
        print("No paid generation request was submitted.")
        print("Run again with --execute only after checking the values above.")
        return

    print("")
    print("Uploading 3 reference images...")
    tokens = {}
    for view in ("front", "left", "back"):
        print(f"Uploading {view}...")
        tokens[view] = upload_file(inputs[view])

    print("Creating Tripo multiview generation task...")
    task_id = create_multiview_task(tokens, args.with_texture)
    print(f"Task ID: {task_id}")

    result = poll_task(
        task_id,
        poll_seconds=args.poll_seconds,
        timeout_minutes=args.timeout_minutes,
    )

    output = result.get("output") or {}
    model_url = output.get("model_url")
    if not model_url:
        raise RuntimeError(
            "Task succeeded but output.model_url is missing. "
            f"Output keys: {sorted(output.keys())}"
        )

    output_path = args.output.resolve()
    print(f"Downloading generated model to: {output_path}")
    download_file(model_url, output_path)

    print("")
    print("TRIPO_NEXIA_GENERATION_OK")
    print(f"Task ID: {task_id}")
    print(f"Credits consumed: {result.get('credits_consumed')}")
    print(f"Saved: {output_path}")
    if output.get("rendered_image_url"):
        print(f"Preview: {output['rendered_image_url']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
