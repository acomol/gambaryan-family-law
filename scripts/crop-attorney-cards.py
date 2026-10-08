"""ATTORNEY-CARD-CROP v1.0.0 | 2026-09-07.

Prepare an Alexander crop against unchanged Yulia framing.
Run only after visually validating the head detector on both source portraits.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("measure_head_top", Path(__file__).with_name("measure-head-top.py"))
assert SPEC and SPEC.loader
measurement = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(measurement)


def crop_box(alexander: Image.Image, yulia: Image.Image, faces: dict, trust_visual: bool = False) -> tuple:
    """Keep the existing 4:5 frame; never pad or upscale either portrait."""
    top_a, top_y = measurement.head_top(alexander), measurement.head_top(yulia)
    # A reviewed coordinate is required: contrast alone also detects mottled
    # background. Do not silently crop against an unverified foreground line.
    for person, detected in (("alexander", top_a), ("yulia", top_y)):
        gap = abs(faces[person]["head_top"] - detected)
        if gap <= 3:
            continue
        if trust_visual:
            # The reviewed coordinate wins on purpose: on these portraits the
            # contrast detector locks onto the studio backdrop gradient, not
            # onto hair. The detector value stays in the evidence so the
            # disagreement is visible in the report rather than hidden.
            print(f"ВНИМАНИЕ {person}: детектор y={detected}, замер глазами "
                  f"y={faces[person]['head_top']}, расхождение {gap}px — взят замер")
            continue
        raise ValueError(f"{person}: detected y={detected}, visually reviewed "
                         f"y={faces[person]['head_top']}; detector needs correction")
    face_y = faces["yulia"]["chin"] - top_y
    face_a = faces["alexander"]["chin"] - top_a
    if min(face_a, face_y) <= 0:
        raise ValueError("Chin must be below head top")
    target_height = yulia.width / .8
    height = face_a / (face_y / target_height)
    width = height * .8
    top = top_a - top_y / target_height * height
    center = faces["alexander"]["center_x"]
    box = (center - width / 2, top, center + width / 2, top + height)
    if min(box[:2]) < 0 or box[2] > alexander.width or box[3] > alexander.height:
        # Cropping a smaller rectangle would enlarge the face and violate the
        # requested equal scale. Never fill outside the photograph with black.
        raise ValueError(f"Equal-scale crop {box} exceeds source {alexander.size}; "
                         "cannot preserve both head height and face scale without an owner decision")
    return box, {"alexander_head_top_detected": top_a, "yulia_head_top_detected": top_y,
            "alexander_head_top_reviewed": faces["alexander"]["head_top"],
            "yulia_head_top_reviewed": faces["yulia"]["head_top"],
                 "alexander_box": list(box), "yulia_box": [0, 0, *yulia.size],
                 "face_scale": face_y / target_height}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ratio", choices=["keep"], default="keep",
                        help="Other window proportions await the owner decision")
    parser.add_argument("--widths", default="480,760,1100")
    parser.add_argument("--version", default="v3")
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--face", type=Path, required=True,
                        help="JSON: alexander/yulia with visually reviewed head_top, chin; Alexander center_x")
    parser.add_argument("--trust-visual", action="store_true",
                        help="Взять замер глазами, когда детектор с ним не согласен; расхождение печатается и попадает в доказательства")
    parser.add_argument("--out", type=Path, default=ROOT / "build" / "attorney-crops")
    args = parser.parse_args()
    faces = json.loads(args.face.read_text(encoding="utf-8"))
    originals = {person: Image.open(ROOT / "docs" / "source-photos" / f"{person}-portrait.jpg").convert("RGB")
                 for person in ("alexander", "yulia")}
    try:
        box, evidence = crop_box(originals["alexander"], originals["yulia"], faces, args.trust_visual)
    except ValueError as error:
        parser.exit(1, f"BLOCKED: {error}\n")
    widths = [int(width) for width in args.widths.split(",")]
    if min(widths) <= 0 or max(widths) > min(box[2] - box[0], originals["yulia"].width):
        parser.error("Widths must be positive and must not upscale either source")
    manifest = {}
    encoded = {}
    for person, original in originals.items():
        person_box = box if person == "alexander" else (0, 0, *original.size)
        variants = []
        for width in widths:
            height = round(width / .8)
            resized = original.resize((width, height), Image.Resampling.LANCZOS, box=person_box)
            variant = {"width": width, "height": height}
            for extension in ("jpg", "webp"):
                output = io.BytesIO()
                options = {"quality": args.quality}
                if extension == "jpg":
                    options["progressive"] = True
                resized.save(output, format="JPEG" if extension == "jpg" else "WEBP", **options)
                data = output.getvalue()
                filename = f"{person}-card-{args.version}-{width}w.{hashlib.sha256(data).hexdigest()[:8]}.{extension}"
                encoded[filename] = data
                key = "fallback" if extension == "jpg" else "webp"
                variant[key] = filename
                variant[f"{key}Bytes"] = len(data)
            variants.append(variant)
        manifest[f"{person}-card-{args.version}"] = {
            "alt": "Адвокат Александр Гамбарян" if person == "alexander" else "Адвокат Юлия Саакян",
            "natural": [round(person_box[2] - person_box[0]), round(person_box[3] - person_box[1])],
            "fallbackExt": "jpg", "variants": variants}
    # Build only: switching site references/removing old assets is a separate
    # step after the visual and rendered head-height gates.
    args.out.mkdir(parents=True, exist_ok=True)
    for filename, data in encoded.items():
        (args.out / filename).write_bytes(data)
    (args.out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out / "crop.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
