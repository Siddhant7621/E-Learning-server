import dotenv from 'dotenv';
dotenv.config();

import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import Stripe from 'stripe';
import Payment from '../models/Payment.js';

export const getAllCourses = TryCatch(async (req, res) => {
    const courses = await Courses.find();
    res.json({
        courses,
    })
})

export const getSingleCourse = TryCatch(async (req, res) => {
    const course = await Courses.findById(req.params.id)

    res.json({
        course
    })
})

export const fetchLectures = TryCatch(async(req, res) => {
    const lectures = await Lecture.find({course : req.params.id})

    const user = await User.findById(req.user._id);

    if(user.role == "admin"){
        return res.json({ lectures });
    }

    if(!user.subscription.includes(req.params.id)) {
        return res.status(400).json({
            message: "You have not subscribes to this course", 
        })
    }

    res.json({lectures});
})

export const fetchLecture = TryCatch(async(req, res) => {
    const lecture = await Lecture.findById(req.params.id)

    const user = await User.findById(req.user._id);

    if(user.role == "admin"){
        return res.json({ lecture });
    }

    if(!user.subscription.includes(lecture.course)) {
        return res.status(400).json({
            message: "You have not subscribes to this course", 
        })
    }

    res.json({lecture});
})

export const getMyCourses = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);

  let courses;
  if (user.role === "admin") {
      // Admin sees only courses they created
      courses = await Courses.find({ createdBy: user._id });
  } else {
      // Regular user sees only their subscribed courses
      courses = await Courses.find({ _id: { $in: user.subscription } });
  }

  res.json({ courses });
});


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const checkout = TryCatch(async (req, res) => {
  try {
    // Retrieve the user and course
    const user = await User.findById(req.user._id);
    const course = await Courses.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }


    if (user.subscription.includes(course._id)) {
      return res.status(400).json({ message: "You already have this course" });
    }

    // Create Stripe Checkout session
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: course.title,
            },
            unit_amount: Math.round(course.price * 100), // Amount in smallest currency unit
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5173/payment-success/${course._id}`, // Replace with your success URL
      cancel_url: `http://localhost:5173/course/${course._id}`, // Replace with your cancel URL
    });

    

    // Respond with the session ID
    const handlePaymentSuccess = async () => {
            user.subscription.push(course._id);
            await user.save();
            
            // Store payment details in the Payment model
            const newPayment = new Payment({
              userId: user._id,
              userName: user.name,
              userEmail: user.email,
              courseId: course._id,
              courseTitle: course.title,
              amountPaid: course.price,
              paymentDate: new Date(),
            });
      
            await newPayment.save();
          };
      
          handlePaymentSuccess();
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


  
