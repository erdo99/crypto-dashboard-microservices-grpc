@echo off
setlocal

cd /d %~dp0
python -m grpc_tools.protoc -I ..\proto --python_out=. --grpc_python_out=. ..\proto\crypto.proto

echo Generated: crypto_pb2.py and crypto_pb2_grpc.py
