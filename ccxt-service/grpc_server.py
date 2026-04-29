import grpc
from concurrent import futures

import app as http_app

# Generated modules (run generate_proto.bat first)
import crypto_pb2
import crypto_pb2_grpc


def _map_errors(raw_errors):
    mapped = []
    for item in raw_errors:
        mapped.append(
            crypto_pb2.CryptoError(
                exchange=str(item.get("exchange", "")),
                symbol=str(item.get("symbol", "")),
                message=str(item.get("message", "")),
            )
        )
    return mapped


def _collect_payload(source: str):
    # Reuse existing HTTP logic and source adapters for now.
    # This keeps HTTP + gRPC behavior aligned during migration.
    with http_app.app.test_request_context(f"/fetch-crypto?source={source}"):
        response, status_code = http_app.fetch_crypto()
        payload = response.get_json() if response else {}
        payload["success"] = status_code == 200
        return payload


class CryptoService(crypto_pb2_grpc.CryptoServiceServicer):
    def GetCryptoList(self, request, context):
        source = (request.source or "all").strip().lower()
        if source not in {"all", "okx", "btcturk"}:
            source = "all"
        payload = _collect_payload(source)
        rows = []
        for row in payload.get("data", []):
            rows.append(
                crypto_pb2.CryptoRow(
                    symbol=str(row.get("symbol", "")),
                    last=float(row.get("last", 0) or 0),
                    percentage=float(row.get("percentage", 0) or 0),
                    volume=float(row.get("volume", 0) or 0),
                    high=float(row.get("high", 0) or 0),
                    low=float(row.get("low", 0) or 0),
                    exchange=str(row.get("exchange", "")),
                )
            )

        return crypto_pb2.GetCryptoListResponse(
            success=bool(payload.get("success", True)),
            data=rows,
            errors=_map_errors(payload.get("errors", [])),
            partial=bool(payload.get("partial", False)),
        )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=8))
    crypto_pb2_grpc.add_CryptoServiceServicer_to_server(CryptoService(), server)
    server.add_insecure_port("[::]:50051")
    print("[grpc] CryptoService listening on :50051")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
