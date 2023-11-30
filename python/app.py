from flask import Flask, Blueprint, request, Response, jsonify
import oracledb
import getpass
from dotenv import load_dotenv
from flask_cors import CORS
from test import conexionBD
import oracledb

load_dotenv()

app = Flask(__name__)
CORS(app)
if __name__ == '__main__':
    conexionBD()
    app.run()
    


