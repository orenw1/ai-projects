#!/bin/sh
#
# create-ts-project.sh
# Creates a simple Node.js + TypeScript project and runs it.
# POSIX sh compatible - works with sh, bash, zsh, dash.
#
# Usage:  sh create-ts-project.sh
#    or:  ./create-ts-project.sh
#

set -eu

# ---------- helpers ----------
info() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31m✘ %s\033[0m\n' "$1" >&2; exit 1; }

# ---------- Step 1: check Node.js and npm ----------
info "Checking Node.js and npm..."
command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Get the LTS version from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || fail "npm is not installed. It normally comes with Node.js."
ok "Node $(node -v), npm $(npm -v)"

# ---------- Ask for the project name ----------
printf '\nEnter project name: '
read -r PROJECT_NAME || true

[ -z "$PROJECT_NAME" ] && fail "Project name cannot be empty."

# npm package names must be lowercase, no spaces
case "$PROJECT_NAME" in
  [!a-z0-9]* | *[!a-z0-9._-]*)
    fail "Invalid name. Use lowercase letters, numbers, '-', '_' or '.' (no spaces), e.g. my-ts-app"
    ;;
esac

[ -e "$PROJECT_NAME" ] && fail "A file or folder named '$PROJECT_NAME' already exists here."

# ---------- Step 2: create the project folder ----------
info "Creating project folder '$PROJECT_NAME'..."
mkdir "$PROJECT_NAME"
cd "$PROJECT_NAME"
npm init -y >/dev/null
ok "package.json created"

# ---------- Step 3: install TypeScript ----------
info "Installing typescript, @types/node and tsx (this may take a moment)..."
npm install --save-dev typescript @types/node tsx --silent
ok "TypeScript and tsx installed"

# ---------- Step 4: create tsconfig.json ----------
info "Creating tsconfig.json..."
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  }
}
EOF
ok "tsconfig.json created"

# ---------- Step 5: write some TypeScript code ----------
info "Creating src/app.ts..."
mkdir -p src
cat > src/app.ts <<'EOF'
function greet(name: string): string {
  return `Hello, ${name}!`;
}

const numbers: number[] = [1, 2, 3, 4, 5];
const sum: number = numbers.reduce((a, b) => a + b, 0);

console.log(greet("World"));
console.log(`The sum is ${sum}`);
EOF
ok "src/app.ts created"

# ---------- Step 6: add scripts to package.json ----------
info "Adding build, start and dev scripts to package.json..."
npm pkg delete scripts.test
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="npm run build && node dist/app.js"
npm pkg set scripts.dev="tsx watch src/app.ts"
ok "Scripts added"

# ---------- Extra: .gitignore ----------
printf 'node_modules\ndist\n' > .gitignore
ok ".gitignore created"

# ---------- Step 7: run it ----------
info "Running: npm start"
npm start

# ---------- Done ----------
printf '\n\033[1;32mAll done! Your project is ready in: %s\033[0m\n' "$(pwd)"
echo "Next time:"
echo "  cd $PROJECT_NAME"
echo "  npm start            # build with tsc, then run dist/app.js"
echo "  npm run dev          # run src/app.ts directly with tsx, re-runs on every save (Ctrl+C to stop)"
echo "  npx tsx src/app.ts # runs src/app.ts TypeScript file in one step"