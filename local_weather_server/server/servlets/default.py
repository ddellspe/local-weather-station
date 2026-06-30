from __future__ import annotations

import os
import re

import flask

default = flask.Blueprint('default', __name__)


@default.route('/')
def default_endpoint() -> flask.Response | dict[str, str]:
    try:
        site_title = os.environ.get('SITE_TITLE', 'Local Weather Server')
        static_folder = flask.current_app.static_folder
        if not static_folder:
            raise FileNotFoundError()
        index_path = os.path.join(static_folder, 'index.html')
        with open(index_path, encoding='utf-8') as f:
            content = f.read()
        content = re.sub(
            r'<title>[^<]*</title>',
            f'<title>{site_title}</title>', content,
        )
        return flask.Response(content, mimetype='text/html')
    except Exception:
        return {'message': 'success'}
