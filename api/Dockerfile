# Use the official Node.js 18 image as a base
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code to the working directory
COPY . .

# Expose the port your Node.js app listens on (e.g., 8080)
EXPOSE 8080

# Define the command to run your application
CMD ["npm", "start"]
