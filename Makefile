# Makefile — POSIX/macOS/Linux convenience wrapper (Git Bash works too).
# Windows users: prefer run.bat.

PY ?= python3
VENV := .venv
BIN := $(VENV)/bin

.PHONY: help setup run clean

help:
	@echo "make setup   - create venv and install Flask"
	@echo "make run     - start the lab on http://localhost:5000"
	@echo "make clean   - remove the venv and SQLite lab databases"

setup: $(VENV)/.installed

$(VENV)/.installed: requirements.txt
	$(PY) -m venv $(VENV)
	$(BIN)/pip install --quiet --upgrade pip
	$(BIN)/pip install --quiet -r requirements.txt
	@touch $(VENV)/.installed

run: setup
	$(BIN)/python lab_server.py

clean:
	rm -rf $(VENV)
	find . -name '*.sqlite3' -delete
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +
