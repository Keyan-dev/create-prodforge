# Draw docs/demo.gif: a scripted terminal run of the prompts (PIL frames, then ffmpeg).
# Usage: cd "$(mktemp -d)" && python3 /path/to/scripts/demo-gif.py /path/to/docs/demo.gif
# Update the answers and file count here when the prompts change.
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 17)
BOLD = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 17)
W, H, PAD, LH = 900, 640, 22, 24
BG, FG = (24, 26, 33), (220, 223, 228)
GRAY, CYAN, GREEN, PURPLE, DIM = (110, 115, 128), (86, 182, 194), (152, 195, 121), (198, 120, 221), (140, 145, 158)

frames = []  # (image, centiseconds)

def render(lines):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    # window chrome
    d.rounded_rectangle([0, 0, W - 1, H - 1], 12, outline=(50, 53, 62))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([PAD + i * 22, 14, PAD + i * 22 + 12, 26], fill=c)
    y = 44
    visible = lines[-((H - 60) // LH):]
    for segs in visible:
        x = PAD
        for text, color, bold in segs:
            f = BOLD if bold else FONT
            d.text((x, y), text, font=f, fill=color)
            x += d.textlength(text, font=f)
        y += LH
    return img

def show(lines, cs):
    frames.append((render(lines), cs))

def t(text, color=FG, bold=False):
    return (text, color, bold)

bar = [t('│', GRAY)]
lines = []
prompt = '$ '
cmd = 'npm create prodforge@latest'
for i in range(len(cmd) + 1):
    show([[t(prompt, GREEN, True), t(cmd[:i])]], 6 if i < len(cmd) else 60)
lines = [[t(prompt, GREEN, True), t(cmd)], []]
lines += [[t('┌  ', GRAY), t('create-prodforge', FG, True)], bar]

def answered(question, answer):
    global lines
    lines += [[t('◇  ', GREEN), t(question)], [t('│  ', GRAY), t(answer, DIM)], bar]

def choose(question, options, pick):
    # Show the select with the cursor moving down to `pick`.
    for cursor in range(pick + 1):
        body = [[t('◆  ', CYAN), t(question)]]
        for i, (label, hint) in enumerate(options):
            if i == cursor:
                body.append([t('│  ', CYAN), t('● ', GREEN), t(label), t(f' ({hint})' if hint else '', DIM)])
            else:
                body.append([t('│  ', CYAN), t('○ ', DIM), t(label, DIM)])
        body.append([t('└', CYAN)])
        show(lines + body, 45 if cursor < pick else 70)
    answered(question, options[pick][0])

# Project name, typed
name = 'my-api'
for i in range(len(name) + 1):
    show(lines + [[t('◆  ', CYAN), t('Project name')], [t('│  ', CYAN), t(name[:i]), t('█', DIM)], [t('└', CYAN)]], 8 if i < len(name) else 40)
answered('Project name', name)
choose('Framework', [('Express', 'recommended'), ('Fastify', ''), ('Hono', '')], 1)
choose('Database', [('Prisma + PostgreSQL', 'recommended'), ('Drizzle + PostgreSQL', ''), ('Mongoose + MongoDB', ''), ('None', '')], 0)
answered('Linter and formatter', 'ESLint + Prettier'); show(lines, 35)
choose('Redis', [('None', ''), ('Redis', 'a shared connection for caching'), ('Redis + BullMQ', 'plus background jobs in a worker')], 2)
choose('Authentication', [('None', ''), ('JWT', 'access and refresh tokens'), ('Better Auth', 'sessions, cookies and bearer tokens')], 2)
answered('Extras', 'OpenAPI docs, Docker, PM2, GitHub Actions CI, Git hooks, OpenTelemetry'); show(lines, 50)
answered('Install dependencies?', 'Yes')
answered('Initialize git?', 'Yes')
lines += [[t('◇  ', GREEN), t('Created 56 files in '), t('my-api', CYAN)], bar]
show(lines, 40)
for i, s in enumerate('◒◐◓◑◒◐◓◑'):
    show(lines + [[t(s + '  ', PURPLE), t('Installing dependencies with pnpm' + '.' * (i % 4))]], 18)
lines += [[t('◇  ', GREEN), t('Installed dependencies')], bar, [t('◇  ', GREEN), t('Initialized a git repository')], bar]
lines += [[t('└  ', GRAY), t('Done! Next:')], [t('   cd my-api')], [t('   pnpm dev')]]
show(lines, 400)

os.makedirs('frames', exist_ok=True)
with open('frames/list.txt', 'w') as f:
    for i, (img, cs) in enumerate(frames):
        img.save(f'frames/{i:04d}.png')
        f.write(f"file '{i:04d}.png'\nduration {cs / 100}\n")
    f.write(f"file '{len(frames) - 1:04d}.png'\n")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-i', 'frames/list.txt',
  '-vf', 'split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none',
  '-loop', '0', OUT], check=True)
print(len(frames), 'frames')
