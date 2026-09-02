#!/usr/bin/env bash
# Automatische Kette: Step 3 → cleanup → Step 4
# Wird nach Step-2-Abschluss gestartet.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
DATA_DIR="$SCRIPT_DIR/data"

echo "[chain] Warte auf Step 2 completion..."
until grep -q "Step 2 complete" "$LOG_DIR/step2.log" 2>/dev/null; do
  sleep 30
done
echo "[chain] Step 2 abgeschlossen."

# Step 3: Export + Namespace-Klassifizierung
echo "[chain] Starte Step 3 (Export)..."
cd "$SCRIPT_DIR"
python 03_export.py > "$LOG_DIR/step3.log" 2>&1
if grep -q "Exported" "$LOG_DIR/step3.log"; then
  echo "[chain] Step 3 erfolgreich."
else
  echo "[chain] FEHLER in Step 3!" && exit 1
fi

# Step 4: Pinecone Indexierung
echo "[chain] Starte Step 4 (Pinecone Indexierung)..."
python 04_rag_pipeline.py full prod > "$LOG_DIR/step4.log" 2>&1
echo "[chain] Step 4 abgeschlossen."
echo "[chain] Pipeline vollständig fertig."
