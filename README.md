# Norn Health Monitoring System

A real-time health monitoring system using ESP32 mmWave radar sensors for sleep and fall detection, with a FastAPI backend and React Native mobile app.

## 📁 Project Structure

```
norn-app/
├── mobile/              # React Native app (Expo)
├── backend/             # Python FastAPI server
├── arduino/             # ESP32 firmware
└── README.md           # This file
```

## 🚀 Quick Setup

### Prerequisites

- **Node.js 18+** and npm
- **Python 3.11+**
- **Arduino IDE** with ESP32 support
- **Supabase account** (https://supabase.com)
- **ESP32 + C1001 Sensor** hardware

### 1. Setup Supabase (5 min)

1. Create account at https://supabase.com
2. Create new project
3. Go to **Settings → API**, copy:
   - `Project URL`: `https://xxxxx.supabase.co`
   - `anon key`: For mobile app
   - `service_role key`: For backend (keep secret!)
4. Run database migrations from `DATABASE_SETUP.md`

### 2. Setup Mobile App (5 min)

```bash
cd mobile

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-key-here
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
EXPO_PUBLIC_ESP32_IP=192.168.1.150
EOF

# Edit .env with your actual values
# Update IP addresses with your computer's IP
```

**Start the app:**
```bash
npm start
```

Press `a` for Android or `i` for iOS simulator.

### 3. Setup Backend (5 min)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Or macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
ESP32_IP=192.168.1.150
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.0:8081
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
DEBUG=true
FALL_ALERT_ENABLED=true
SLEEP_QUALITY_THRESHOLD=60
ABNORMAL_STRUGGLE_THRESHOLD=5
EOF

# Edit .env with your actual values
```

**Start the server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 4. Setup ESP32 (10 min)

**Install Arduino Libraries:**
1. Open Arduino IDE
2. Install ESP32 board support:
   - **File → Preferences**
   - Add URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - **Tools → Board → Boards Manager** → Install "ESP32"
3. Install library:
   - **Sketch → Include Library → Manage Libraries**
   - Search and install: `DFRobot_HumanDetection`

**Wire the sensor:**
```
ESP32      C1001
GPIO 4  →  RX
GPIO 5  →  TX
5V      →  VCC
GND     →  GND
```

**Upload firmware:**
1. Open `arduino/norn_sensor/norn_sensor.ino`
2. Update these lines:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* backend_url = "http://192.168.1.100:8000/api/v1/sensor/data";
   ```
3. **Tools → Board** → ESP32 Dev Module
4. **Tools → Port** → Select your ESP32
5. Click **Upload**
6. Open **Serial Monitor** (115200 baud)
7. Copy the ESP32 IP address shown

**Update .env files with ESP32 IP:**
- `mobile/.env`: `EXPO_PUBLIC_ESP32_IP=<ESP32_IP>`
- `backend/.env`: `ESP32_IP=<ESP32_IP>`

## 🔄 System Flow

```
1. User switches mode in Mobile App
         ↓
2. Mobile calls Backend API
         ↓
3. Backend sends command to ESP32
         ↓
4. ESP32 switches sensor mode
         ↓
5. ESP32 sends data (every 1 second)
         ↓
6. Backend processes & stores in Supabase
         ↓
7. Mobile App displays real-time data
```

## 🧪 Testing

### Test Backend
```bash
# Health check
curl http://localhost:8000/health

# System status
curl http://localhost:8000/api/v1/health/status
```

### Test ESP32
```bash
# Switch to fall detection
curl "http://192.168.1.150/set-mode?mode=fall"

# Should return: {"status":"ok","mode":"fall"}
```

### Test Full Flow
1. Start backend and mobile app
2. In mobile app, switch between Sleep/Fall modes
3. Check ESP32 Serial Monitor - should show mode changes
4. Check backend logs - should show data coming in
5. Open Supabase dashboard - should see data in tables

## 📊 Environment Variables

### Mobile (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase anon key | `eyJxxx...` |
| `EXPO_PUBLIC_API_URL` | Backend API URL | `http://192.168.1.100:8000` |
| `EXPO_PUBLIC_ESP32_IP` | ESP32 device IP | `192.168.1.150` |

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJxxx...` |
| `ESP32_IP` | ESP32 device IP | `192.168.1.150` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:8081` |

## 🐳 Docker Deployment (Optional)

```bash
# Start backend with Docker
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

## 🔍 Troubleshooting

### Mobile can't connect to backend
- Use your computer's IP, not `localhost` (get IP: `ipconfig` on Windows, `ifconfig` on Mac/Linux)
- Ensure mobile device is on same network as backend
- Check backend is running: `curl http://<YOUR_IP>:8000/health`

### Backend can't connect to ESP32
- Verify ESP32 IP in Serial Monitor
- Test directly: `curl http://<ESP32_IP>/set-mode?mode=sleep`
- Check ESP32 and backend are on same network

### ESP32 won't connect to Wi-Fi
- Check SSID and password are correct
- Use 2.4GHz network (ESP32 doesn't support 5GHz)
- Check router allows IoT devices

### Supabase errors
- Mobile uses **anon key**, backend uses **service_role key**
- Verify keys are correct in `.env` files
- Check database tables exist (run migrations)

## 📱 Mobile App Features

- User authentication (Supabase Auth)
- Real-time sensor data display
- Mode switching (Sleep/Fall Detection)
- Health metrics dashboard
- Alert notifications
- User profile management

## 🔧 Backend API Endpoints

- `POST /api/v1/sensor/data` - Receive sensor data from ESP32
- `GET /api/v1/sensor/readings/{mode}` - Get latest readings
- `POST /api/v1/mode/change` - Change ESP32 mode
- `GET /api/v1/health/status` - System health check

Full API docs: http://localhost:8000/docs

## 🔌 ESP32 Endpoints

- `GET /set-mode?mode=sleep` - Switch to sleep detection
- `GET /set-mode?mode=fall` - Switch to fall detection

## 🗄️ Database Schema

### Tables
- `profiles` - User profiles
- `sensor_readings` - Fall detection data
- `sleep_readings` - Sleep detection data
- `alerts` - System alerts

See `DATABASE_SETUP.md` for full schema and migrations.

## 📚 Tech Stack

### Mobile App
- React Native 0.79
- Expo SDK 53
- TypeScript
- NativeWind (Tailwind CSS)
- Zustand (State)
- React Query (Data)
- Supabase Client

### Backend
- FastAPI 0.115
- Python 3.11+
- Pydantic (Validation)
- Supabase Python SDK
- Uvicorn (Server)

### ESP32 Firmware
- Arduino Framework
- C++
- DFRobot C1001 Library
- WiFi/HTTP Client

## 🔐 Security Notes

- ✅ Never commit `.env` files (they're gitignored)
- ✅ Use **anon key** in mobile (public-facing)
- ✅ Use **service_role key** in backend only (server-side)
- ✅ Keep service_role key secret
- ✅ Enable Row Level Security in Supabase

## 🎯 Project Commands

### Mobile
```bash
cd mobile
npm install          # Install dependencies
npm start           # Start dev server
npm run android     # Run on Android
npm run ios         # Run on iOS
```

### Backend
```bash
cd backend
python -m venv venv                        # Create virtual env
venv\Scripts\activate                      # Activate (Windows)
pip install -r requirements.txt            # Install dependencies
uvicorn app.main:app --reload             # Start server
```

### Arduino
- Open `arduino/norn_sensor/norn_sensor.ino` in Arduino IDE
- Upload to ESP32

## 💡 Tips

- Keep 3 terminals open: backend, mobile, serial monitor
- Use your computer's local IP for `EXPO_PUBLIC_API_URL`, not `localhost`
- Check Supabase dashboard to verify data is flowing
- Monitor backend logs for errors
- Check ESP32 Serial Monitor for connection status

## 📖 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [DFRobot C1001 Wiki](https://wiki.dfrobot.com/)

## 📄 License

MIT

---

**Ready to start?** Follow the Quick Setup steps above! 🚀
