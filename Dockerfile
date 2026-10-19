FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 MIKUBOT_DATA_DIR=/data
WORKDIR /app
COPY requirements-server.txt /app/
RUN pip install --no-cache-dir -r requirements-server.txt \
    && groupadd --gid 10001 mikubot \
    && useradd --uid 10001 --gid 10001 --no-create-home mikubot \
    && mkdir /data && chown 10001:10001 /data
COPY mikubot /app/mikubot
COPY qunyu /app/qunyu
USER 10001:10001
VOLUME /data
EXPOSE 8765
ENTRYPOINT ["python", "-m", "mikubot"]
CMD ["--no-browser", "--no-tray", "--host", "0.0.0.0", "--port", "8765"]
