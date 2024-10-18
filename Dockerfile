# Use image with ruby, Node.js, npm, and yarn
FROM timbru31/ruby-node:latest

# Grab dependencies
WORKDIR /app
COPY . /app

# Expose port 4000
EXPOSE 4000

# Start jekyll server
CMD ["bundle", "exec", "jekyll", "serve", "-H", "0.0.0.0"]
