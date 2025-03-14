#!/bin/bash
# CursorFlow MCP Server Installation Script

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
PURPLE="\033[0;35m"
RESET="\033[0m"

# Banner
echo -e "${BOLD}${PURPLE}"
echo "  _____                      _____ _               "
echo " / ____|                    |  __ \ |              "
echo "| |    _   _ _ __ ___  ___ | |__) | | _____      _"
echo "| |   | | | | '__/ __|/ _ \|  ___/| |/ _ \ \ /\ / /"
echo "| |___| |_| | |  \__ \ (_) | |    | | (_) \ V  V / "
echo " \_____\__,_|_|  |___/\___/|_|    |_|\___/ \_/\_/  "
echo "                                                   "
echo -e "${RESET}"
echo -e "${BOLD}MCP Server Installation${RESET}"
echo -e "===========================\n"

# Check if Node.js is installed
echo -e "${BLUE}Checking prerequisites...${RESET}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed.${RESET}"
  echo -e "Please install Node.js v18 or later from https://nodejs.org/"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d "v" -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d "." -f 1)

if [ $NODE_MAJOR -lt 18 ]; then
  echo -e "${YELLOW}Warning: Node.js version $NODE_VERSION detected.${RESET}"
  echo -e "CursorFlow recommends Node.js v18 or later."
  echo -e "Continue anyway? (y/n)"
  read -r response
  if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "Installation cancelled."
    exit 1
  fi
else
  echo -e "${GREEN}Node.js v$NODE_VERSION detected.${RESET}"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed.${RESET}"
  echo -e "Please install npm. It usually comes with Node.js."
  exit 1
fi

echo -e "${GREEN}Prerequisites satisfied.${RESET}\n"

# Installation method
echo -e "${BOLD}Installation Method${RESET}"
echo -e "1. Standard (npm)"
echo -e "2. Docker"
echo -e "3. Manual (advanced users)"
echo -e "Please choose an installation method (1-3):"
read -r INSTALL_METHOD

case $INSTALL_METHOD in
  1)
    # Standard installation
    echo -e "\n${BLUE}Starting standard installation...${RESET}"
    
    # Install dependencies
    echo -e "${BLUE}Installing dependencies...${RESET}"
    npm install
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}Error: Failed to install dependencies.${RESET}"
      echo -e "Please check the error messages above and try again."
      exit 1
    fi
    
    # Create data directories
    echo -e "${BLUE}Creating data directories...${RESET}"
    mkdir -p ./data/memory-bank
    mkdir -p ./data/workflows
    mkdir -p ./data/modes
    
    # Create .env file
    echo -e "${BLUE}Setting up environment configuration...${RESET}"
    
    if [ -f .env ]; then
      echo -e "${YELLOW}An existing .env file was found.${RESET}"
      echo -e "Would you like to overwrite it? (y/n)"
      read -r response
      if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "Keeping existing .env file."
      else
        # Generate new .env file
        cat > .env << EOF
PORT=3000
HOST=localhost
AUTH_TOKEN=$(openssl rand -hex 16)
DATA_DIR=./data
MEMORY_BANK_DIR=./data/memory-bank
WORKFLOWS_DIR=./data/workflows
MODES_DIR=./data/modes
LOG_LEVEL=info
ENABLE_CACHE=true
USE_DATABASE=true
DATABASE_PATH=./data/memory-bank/memory-bank.db
EOF
        echo -e "${GREEN}Created new .env file.${RESET}"
        echo -e "${YELLOW}Your authentication token is: $(grep AUTH_TOKEN .env | cut -d "=" -f 2)${RESET}"
        echo -e "You'll need this token to connect to the server."
      fi
    else
      # Generate new .env file
      cat > .env << EOF
PORT=3000
HOST=localhost
AUTH_TOKEN=$(openssl rand -hex 16)
DATA_DIR=./data
MEMORY_BANK_DIR=./data/memory-bank
WORKFLOWS_DIR=./data/workflows
MODES_DIR=./data/modes
LOG_LEVEL=info
ENABLE_CACHE=true
USE_DATABASE=true
DATABASE_PATH=./data/memory-bank/memory-bank.db
EOF
      echo -e "${GREEN}Created new .env file.${RESET}"
      echo -e "${YELLOW}Your authentication token is: $(grep AUTH_TOKEN .env | cut -d "=" -f 2)${RESET}"
      echo -e "You'll need this token to connect to the server."
    fi
    
    # Install pm2 for process management (optional)
    echo -e "\n${BLUE}Would you like to install PM2 for process management? (y/n)${RESET}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      npm install pm2 -g
      
      if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: Failed to install PM2 globally.${RESET}"
        echo -e "You can still run the server with 'npm start'."
      else
        # Create pm2 ecosystem file
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cursorflow-mcp',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
EOF
        echo -e "${GREEN}PM2 installed and configured.${RESET}"
      fi
    fi
    
    echo -e "\n${GREEN}Installation completed successfully!${RESET}"
    echo -e "\n${BOLD}To start the server, run:${RESET}"
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]] && command -v pm2 &> /dev/null; then
      echo -e "  pm2 start ecosystem.config.js"
    else
      echo -e "  npm start"
    fi
    
    echo -e "\n${BOLD}To view the Memory Bank visualization:${RESET}"
    echo -e "  1. Start the server"
    echo -e "  2. Open a browser and navigate to http://localhost:3000"
    echo -e "  3. Connect with your authentication token"
    
    ;;
    
  2)
    # Docker installation
    echo -e "\n${BLUE}Starting Docker installation...${RESET}"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
      echo -e "${RED}Error: Docker is not installed.${RESET}"
      echo -e "Please install Docker from https://docs.docker.com/get-docker/"
      exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
      echo -e "${RED}Error: Docker Compose is not installed.${RESET}"
      echo -e "Please install Docker Compose from https://docs.docker.com/compose/install/"
      exit 1
    fi
    
    echo -e "${GREEN}Docker and Docker Compose detected.${RESET}"
    
    # Generate auth token for Docker
    AUTH_TOKEN=$(openssl rand -hex 16)
    
    # Build and start containers
    echo -e "${BLUE}Building and starting containers...${RESET}"
    AUTH_TOKEN=$AUTH_TOKEN docker-compose up -d --build
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}Error: Failed to build and start containers.${RESET}"
      echo -e "Please check the error messages above and try again."
      exit 1
    fi
    
    echo -e "\n${GREEN}Docker installation completed successfully!${RESET}"
    echo -e "${YELLOW}Your authentication token is: $AUTH_TOKEN${RESET}"
    echo -e "You'll need this token to connect to the server."
    
    echo -e "\n${BOLD}To view the Memory Bank visualization:${RESET}"
    echo -e "  1. Open a browser and navigate to http://localhost:3000"
    echo -e "  2. Connect with your authentication token"
    
    echo -e "\n${BOLD}Docker container management:${RESET}"
    echo -e "  - View logs: docker-compose logs -f"
    echo -e "  - Stop server: docker-compose down"
    echo -e "  - Restart server: docker-compose restart"
    
    ;;
    
  3)
    # Manual installation
    echo -e "\n${BLUE}Starting manual installation...${RESET}"
    echo -e "Manual installation requires the following steps:"
    echo -e "1. Install dependencies: npm install"
    echo -e "2. Create data directories: mkdir -p ./data/memory-bank ./data/workflows ./data/modes"
    echo -e "3. Create a .env file with your configuration"
    echo -e "4. Start the server: npm start"
    
    echo -e "\nFor more details, please refer to the README.md file."
    ;;
    
  *)
    echo -e "${RED}Invalid option selected.${RESET}"
    echo -e "Please run the installation script again and select a valid option (1-3)."
    exit 1
    ;;
esac

echo -e "\n${BOLD}${GREEN}Thank you for installing CursorFlow MCP Server!${RESET}"
echo -e "For issues or contributions, please visit our GitHub repository."
echo -e "Enjoy using CursorFlow!\n" 