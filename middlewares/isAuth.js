import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';



export const isAuth = async (req, res, next) => {
    try {
        const token = req.headers.token; 
        if (!token) {
            return res.status(403).json({ message: "Token missing" });
        }

        const decodedData = jwt.verify(token, process.env.Jwt_Sec);
        req.user = await User.findById(decodedData._id);

        if (!req.user) {
            return res.status(403).json({ message: "Invalid Token - User Not Found" });
        }

        next();
    } catch (error) {
        console.error("Token Error:", error.message);
        res.status(500).json({ message: "Invalid or Expired Token" });
    }
};


export const isAdmin = (req, res, next) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "You are not admin" });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
