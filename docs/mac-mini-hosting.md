# Hosting the API on a Mac mini

The API on Render's free plan goes to sleep when idle. This guide runs the same API on an always-on Mac mini at no cost, with a Cloudflare Tunnel for the public HTTPS address. Only the API moves:

| Part | Where after the move |
|---|---|
| API (FastAPI) | Mac mini, `127.0.0.1:8000`, started by launchd at boot |
| Public address | `https://api.findyoursole.app` through a Cloudflare Tunnel (no router port forwarding) |
| Web (`findyoursole.app`) | Stays a Render Static Site. Static sites do not sleep. |
| Database | Stays on Neon. The Mac mini uses the same `DATABASE_URL`. |
| Daily price job | Optional launchd job on the Mac mini (a Render cron job has a monthly charge) |

Files are in `deploy/macmini/`. Nothing in the API code changes.

## 1. Mac mini settings

- Keep it awake: System Settings > Energy > "Prevent automatic sleeping when the display is off" and "Start up automatically after a power failure". Check with `pmset -g`: `sleep 0` means it never sleeps.
- The jobs are LaunchDaemons, so they start at boot without anyone logging in. With FileVault on, the Mac waits at the unlock screen after a reboot until someone types the password, so nothing runs until then. For macOS updates use `sudo fdesetup authrestart`, or accept that you unlock it after each restart.
- Clone the repository outside `~/Desktop`, `~/Documents` and `~/Downloads` (macOS privacy rules block background jobs there), for example `~/find-your-sole`.

## 2. Install the API

```sh
git clone https://github.com/areumseo/find-your-sole.git ~/find-your-sole
cd ~/find-your-sole
deploy/macmini/install.sh          # first run creates ~/.config/find-your-sole/api.env and stops
```

Open `~/.config/find-your-sole/api.env` and copy the values from the Render API service's Environment page. Do not commit or share this file. Then:

```sh
deploy/macmini/install.sh          # add --with-cron for the daily price job
```

It needs Python 3.11 or newer as `python3`. Set `PYTHON=/path/to/python3` to use another one, for example one installed with Homebrew or mise. The script creates `.venv/`, installs `api/requirements.txt`, installs the launchd jobs (it asks for your password) and checks `http://127.0.0.1:8000/health`.

Logs are in `~/Library/Logs/find-your-sole/`. The startup checks print missing keys there, as they did in the Render logs.

## 3. Public address with Cloudflare Tunnel

This needs the `findyoursole.app` DNS on Cloudflare. If the domain uses another DNS provider, move its nameservers to Cloudflare first (free plan).

```sh
brew install cloudflared
cloudflared tunnel login                       # pick findyoursole.app in the browser
cloudflared tunnel create find-your-sole       # prints the tunnel id
cloudflared tunnel route dns find-your-sole api.findyoursole.app
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/<TUNNEL_ID>.json /etc/cloudflared/
sudo cp deploy/macmini/cloudflared-config.example.yml /etc/cloudflared/config.yml
sudo nano /etc/cloudflared/config.yml          # replace <TUNNEL_ID>
sudo cloudflared service install               # starts at boot
curl https://api.findyoursole.app/health
```

The API listens only on `127.0.0.1`, so the tunnel is the only way in. Cloudflare sends `X-Forwarded-For`, so the per-visitor limits for `/explain` and `/feedback` still work as they did behind Render.

## 4. Switch the web app over

1. Check that `https://api.findyoursole.app/health` answers from a phone on mobile data.
2. In the Render Static Site (`find-your-sole-web`), set `VITE_API_URL=https://api.findyoursole.app` and redeploy.
3. Open `findyoursole.app` and get a recommendation, an AI comment and the news list.
4. After a few days without problems, suspend the Render API service (and the Render cron job, if it exists, once the Mac mini job is installed). After that, update the API address in `AGENTS.md` and the fallback URL in `web/src/api.ts`.

To roll back, clear `VITE_API_URL` on the static site and redeploy. The web app falls back to `find-your-sole.onrender.com`.

## Updating

Render deployed on every push to `main`. On the Mac mini, run this after merging:

```sh
~/find-your-sole/deploy/macmini/update.sh
```

It pulls `main`, installs requirements and restarts the API. Web changes still deploy on Render as before.

## Useful commands

```sh
sudo launchctl kickstart -k system/app.findyoursole.api     # restart the API
sudo launchctl bootout system/app.findyoursole.api          # stop it (until the next boot or install)
sudo launchctl kickstart system/app.findyoursole.catalog-sync   # run the price job now
tail -f ~/Library/Logs/find-your-sole/api.log
deploy/macmini/run-catalog-sync.sh --dry-run                # check sources without DB writes
```

There is no down alert. A free external monitor (for example UptimeRobot on `/health`) can email you if the Mac mini or the tunnel stops.
