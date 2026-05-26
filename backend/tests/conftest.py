"""Force SQLite pour les tests (avant import de l'application)."""

import os

os.environ["DATABASE_URL"] = "app.db"
