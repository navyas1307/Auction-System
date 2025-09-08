import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Get database connection string
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  throw new Error('DATABASE_URL is required in .env file');
};

// Initialize Sequelize
const sequelize = new Sequelize(getDatabaseUrl(), {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Define Auction model with image support and optional user authentication
export const Auction = sequelize.define('Auction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  images: {
    type: DataTypes.JSONB, // Store array of image objects as JSONB
    defaultValue: []
  },
  startingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  bidIncrement: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in minutes
    allowNull: false
  },
  sellerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sellerEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sellerId: {
    type: DataTypes.STRING, // Changed from UUID to STRING and made nullable
    allowNull: true, // Allow null for guest selling
    defaultValue: null
  },
  status: {
    type: DataTypes.ENUM('active', 'ended'),
    defaultValue: 'active'
  },
  startTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define Bid model with optional user authentication for guest bidding
export const Bid = sequelize.define('Bid', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  auctionId: {
    type: DataTypes.INTEGER,
    references: {
      model: Auction,
      key: 'id'
    }
  },
  bidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  bidderName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bidderEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bidderId: {
    type: DataTypes.STRING, // Changed from UUID to STRING and made nullable
    allowNull: true, // Allow null for guest bidding
    defaultValue: null
  },
  bidTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define associations
Auction.hasMany(Bid, { foreignKey: 'auctionId' });
Bid.belongsTo(Auction, { foreignKey: 'auctionId' });

// Initialize database
export const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Force recreate tables - THIS WILL DELETE ALL EXISTING DATA
    // Use this in development when you need to change data types
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully with force recreate.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
};

export { sequelize };
