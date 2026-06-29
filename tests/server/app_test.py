from __future__ import annotations

import os

from local_weather_server.server.app import create_database


def test_create_database_when_file_does_not_exist(tempdir_factory):
    new_db_path = os.path.join(tempdir_factory.get(), 'new.db')
    create_database(new_db_path)
    assert os.path.exists(new_db_path)


def test_create_database_when_file_already_exists(tempdir_factory):
    new_db_path = os.path.join(tempdir_factory.get(), 'new.db')
    create_database(new_db_path)
    create_database(new_db_path)
    assert os.path.exists(new_db_path)
