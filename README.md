# IoT Command Language and Device Simulation Engine

A small, full-stack Compiler Design project. It compiles a readable IoT rule language through lexical analysis, parsing, semantic validation, intermediate representation (IR), and execution against simulated sensors and devices. It does not connect to real hardware.

## Features

- Multi-line command editor with token stream, compiler feedback, and JSON IR.
- Editable temperature, light, and humidity inputs, plus random value generation.
- Virtual FAN, LIGHT, HEATER, AC, and BUZZER state cards.
- Conditional execution and a timestamped execution history.
- Express REST API and MongoDB persistence through Mongoose.
- In-memory fallback when MongoDB is not configured or unavailable. This mode resets when the server stops.

## Requirements and setup

- Node.js 18 or newer and npm.
- MongoDB Community Server running locally, or a MongoDB connection URI. MongoDB is optional for a quick in-memory demo.

From this project directory:

```sh
cd backend
npm install
```

Copy `.env.example` to `backend/.env` (or set the values in your shell). The default URI is `mongodb://127.0.0.1:27017/iot_command_engine`. To run without MongoDB, leave `MONGODB_URI` blank or unset. Then start the app:

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Express serves the frontend and API from the same origin. In the dashboard header, “MongoDB connected” indicates persistent storage; “Memory mode” indicates temporary in-process storage.

For MongoDB Compass, connect to `mongodb://127.0.0.1:27017` and inspect the `iot_command_engine` database. Collections are created when records are first saved: `commands`, `sensors`, `devices`, and `executionhistories` (Mongoose's pluralized collection names).

## Publish a shareable link

The local address `http://localhost:3000` is only available on the computer running the server. To give others a link, publish this project to a GitHub repository and deploy it with a web host. A Render Blueprint is included at `render.yaml`.

1. Put the contents of this project folder in a GitHub repository. Do not commit `.env` or `node_modules`; they are excluded by `.gitignore`.
2. In Render, create a new **Blueprint** and connect that repository. Render reads `render.yaml`, installs the backend packages, starts Express on the free web-service plan, and provides a public `onrender.com` URL. Free services can spin down when idle, so the first visit after inactivity may take longer.
3. For a quick demo, leave `MONGODB_URI` unset; app state is temporary and resets when the service restarts. For persistent storage, create a MongoDB Atlas database user and database, then set `MONGODB_URI` as a secret environment variable in Render. Configure Atlas network access to allow the app host's outbound IPs; avoid opening database access to all IPs.
4. After deployment is healthy, share the Render URL with others.

Render deploys from a connected Git repository and assigns a public URL after deployment. See [Render's Node/Express deployment guide](https://render.com/docs/deploy-node-express-app) and [MongoDB Atlas connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

## Command language

One command per line:

```text
IF <sensor> <operator> <number> THEN <device> <state>
```

| Element | Allowed values |
|---|---|
| Sensor | `temperature`, `light`, `humidity` |
| Operator | `>`, `<`, `>=`, `<=`, `==` |
| Device | `FAN`, `LIGHT`, `HEATER`, `AC`, `BUZZER` |
| State | `ON`, `OFF` |

Keywords and device/state names are case-insensitive. Sensors are stored in lowercase in the IR. Sensor ranges are temperature −50 to 100, light 0 to 100, and humidity 0 to 100. An out-of-range threshold is a semantic error.

Examples:

```text
IF temperature > 30 THEN FAN ON
IF light < 20 THEN LIGHT ON
IF humidity > 70 THEN FAN OFF
IF temperature < 20 THEN HEATER ON
```

## Compiler stages

1. **Lexer** (`backend/compiler/lexer.js`) scans a line into typed tokens. Unsupported characters are lexical errors. Unknown words remain identifiers so later passes can report a meaningful semantic error.
2. **Parser** (`parser.js`) checks the command shape against `IF SENSOR OPERATOR NUMBER THEN DEVICE STATE` and constructs an AST.
3. **Semantic analyzer** (`semanticAnalyzer.js`) validates sensor, device, action, numeric threshold, and the sensor's supported range.
4. **IR generator** (`intermediateCode.js`) lowers the AST to a compact `CONDITIONAL` JSON object.
5. **Execution engine** (`executionEngine.js`) reads the current simulated sensor value and updates the selected virtual device only when the condition is true.

Each non-empty line is compiled independently, so a bad command does not prevent other lines from being analyzed or run. Invalid commands are recorded with their compiler error and are not executed.

## REST API

All endpoints return JSON. Start the server at port 3000 by default (`PORT` changes it).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/analyze` | Compile and persist command analysis. Body: `{ "command": "IF temperature > 30 THEN FAN ON" }` (newlines for multiple commands). |
| `POST` | `/api/execute` | Compile, evaluate against current sensors, update device states, and store execution history. Same body as analyze. |
| `GET` | `/api/sensors` | Read current simulated sensor values. |
| `PUT` | `/api/sensors` | Update one or more values. Body example: `{ "temperature": 32, "light": 15, "humidity": 65 }`. |
| `GET` | `/api/devices` | Read virtual device states. |
| `GET` | `/api/history?limit=50` | Read newest execution records; maximum limit is 100. |
| `GET` | `/api/health` | Check app status and whether storage is MongoDB or memory. |

## Test cases

The following cases can be pasted in the editor. Expected results assume the shown sensor value.

| Input | Expected result |
|---|---|
| Sensor `temperature=32`; `IF temperature > 30 THEN FAN ON` | Parse and semantic pass; IR generated; condition TRUE; FAN becomes ON. |
| Sensor `temperature=25`; `IF temperature > 30 THEN FAN ON` | Compiler passes; condition FALSE; FAN state is unchanged. |
| `IF light < 20 THEN LIGHT ON` with `light=15` | Condition TRUE; LIGHT becomes ON. |
| `IF temp@ > 30 THEN FAN ON` | Lexical error at `@`. |
| `IF temperature 30 THEN FAN ON` | Syntax error: relational operator expected. |
| `IF temperature > 30 THEN MOTOR ON` | Semantic error: MOTOR is not a supported device. |
| `IF pressure > 30 THEN FAN ON` | Semantic error: unknown sensor. |
| `IF temperature > 101 THEN FAN ON` | Semantic error: temperature threshold out of range. |
| `IF temperature > 30 THEN FAN ON` plus `IF humidity > 70 THEN BUZZER ON` | Each line is processed independently; each device changes only if its own condition is true. |

## Project layout

```text
iot-command-engine/
├── backend/
│   ├── compiler/       # lexer, parser, semantic analysis, IR, execution
│   ├── models/         # Mongoose schemas
│   ├── routes/         # command, sensor, device APIs
│   ├── persistence.js  # MongoDB and in-memory storage adapter
│   ├── server.js
│   └── package.json
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```
