FROM n8nio/n8n:latest

# Install Python for CSV processing
USER root
RUN apk add --update python3 py3-pip py3-pandas

# Work directory
WORKDIR /data

# Copy workflow and data files
COPY n8n-advanced-workflow.json /data/
COPY data /data/data/

# Set user back to node
USER node

# Expose n8n port
EXPOSE 5678

# Start n8n
CMD ["n8n"]