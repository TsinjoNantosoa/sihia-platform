"""One-shot brand asset generation from the official SIHIA logo. Do not redraw."""

from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\Tsinjo\.cursor\projects\c-Users-Tsinjo-Documents-projet-sihia-platform"
    r"\assets\c__Users_Tsinjo_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"be45d291767a5756ddb0e90b1651b2c7_images_SIHIA-LOGO-adac9b95-ed23-4bc4-badd-3f0c415dfece.png"
)
ROOT = Path(r"c:\Users\Tsinjo\Documents\projet\sihia-platform\frontend")
PUBLIC = ROOT / "public"
PUBLIC_BRAND = PUBLIC / "brand"


def knockout_black(im: Image.Image, thresh: int = 12) -> Image.Image:
    px = im.convert("RGBA")
    data = px.load()
    w, h = px.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            mx = max(r, g, b)
            if g >= 16 or b >= 16:
                continue
            if mx <= thresh:
                data[x, y] = (r, g, b, 0)
            elif mx < thresh + 16:
                alpha = int(255 * (mx - thresh) / 16)
                data[x, y] = (r, g, b, alpha)
    return px


def crop_pad(im: Image.Image, box: tuple[int, int, int, int], pad: int = 16) -> Image.Image:
    l, t, r, b = box
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def make_square(im: Image.Image, pad_ratio: float = 0.12) -> Image.Image:
    w, h = im.size
    side = max(w, h)
    extra = int(side * pad_ratio)
    canvas = Image.new("RGBA", (side + extra * 2, side + extra * 2), (0, 0, 0, 0))
    canvas.paste(im, ((canvas.width - w) // 2, (canvas.height - h) // 2), im)
    return canvas


def save(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)
    print(f"wrote {path} {im.size}")


def main() -> None:
    raw = Image.open(SRC).convert("RGBA")
    transparent = knockout_black(raw)

    full = crop_pad(transparent, (73, 43, 958, 305), pad=20)
    compact = crop_pad(transparent, (73, 43, 958, 228), pad=16)
    icon = make_square(crop_pad(transparent, (73, 43, 312, 305), pad=8), pad_ratio=0.08)

    PUBLIC_BRAND.mkdir(parents=True, exist_ok=True)

    save(full, PUBLIC_BRAND / "sihia-logo-primary.png")
    save(compact, PUBLIC_BRAND / "sihia-logo-compact.png")
    save(icon, PUBLIC_BRAND / "sihia-icon.png")

    fav32 = icon.resize((32, 32), Image.Resampling.LANCZOS)
    fav16 = icon.resize((16, 16), Image.Resampling.LANCZOS)
    apple = icon.resize((180, 180), Image.Resampling.LANCZOS)
    save(fav16, PUBLIC / "favicon-16x16.png")
    save(fav32, PUBLIC / "favicon-32x32.png")
    save(apple, PUBLIC / "apple-touch-icon.png")
    fav32.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])
    print("wrote favicon.ico")


if __name__ == "__main__":
    main()
