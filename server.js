
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const validEvents = {
  "Paper and Poster Presentation": 150,
  "Webathon": 200,
  "Project Expo": 250,
  "Photography Challenge": 100,
  "IPL Auction": 120,
  "BGMI Tournament": 300,
  "Digital Ping Pong": 80,
  "Scary House": 100,
  "Mini Golf": 120,
  "Capture The Flag": 150,
  "Binary Bounty Hunt": 100,
  "Pixel Art": 120,
  "Drone Dojo": 200,
  "Laser Tag": 150
};


const uri = process.env.MONGODB_URI || "mongodb+srv://viveak910:<db_password>@acumen-backend.ydo43.mongodb.net/?retryWrites=true&w=majority&appName=acumen-backend";


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    return client.db("acumenIT2025");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}


async function sendConfirmationEmail(registration) {
  try {
   
    const eventsListHTML = registration.selectedEvents.map(event => 
      `<li>${event.title} - ₹${event.price}</li>`
    ).join('');
    
   
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: registration.email,
      subject: 'ACUMENIT 2025 - Registration Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h1 style="color: #4a86e8; text-align: center;">ACUMENIT 2025</h1>
          <h2 style="color: #333;">Registration Confirmation</h2>
          
          <p>Dear ${registration.name},</p>
          
          <p>Thank you for registering for ACUMENIT 2025! We're excited to have you participate in our technical fest.</p>
          
          <h3>Registration Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${registration.name}</li>
            <li><strong>Roll No:</strong> ${registration.rollNo}</li>
            <li><strong>Branch:</strong> ${registration.branch}</li>
            <li><strong>Year & Section:</strong> ${registration.year} - ${registration.section}</li>
            <li><strong>College:</strong> ${registration.college}</li>
            <li><strong>Transaction ID:</strong> ${registration.transactionId}</li>
          </ul>
          
          <h3>Events Registered:</h3>
          <ul>
            ${eventsListHTML}
          </ul>
          
          <p><strong>Total Amount Paid:</strong> ₹${registration.totalAmount}</p>
          
          <p>We look forward to seeing you at the events! Please keep this email for future reference. If you have any questions, feel free to contact us.</p>
          
          <p>Best regards,<br>
          The ACUMENIT Team</p>
          
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            <p>Thanks for registering with ACUMENIT 2025!</p>
          </div>
        </div>
      `
    };
    
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${registration.email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return false;
  }
}

app.post('/api/register', async (req, res) => {
  let db;
  
  try {
    db = await connectToMongoDB();
    const registrationsCollection = db.collection("registrations");
    
    const { selectedEvents, totalAmount, ...rest } = req.body;

    
    if (!Array.isArray(selectedEvents)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event format. Expected array of event titles."
      });
    }
    
    
    const registration = {
      name: req.body.name,
      email: req.body.email,
      branch: req.body.branch,
      section: req.body.section,
      year: req.body.year,
      rollNo: req.body.rollNo,
      college: req.body.college,
      selectedEvents: selectedEvents.map(title => ({
        title,
        price: validEvents[title]
      })),
      totalAmount: parseFloat(req.body.totalAmount),
      transactionId: req.body.transactionId,
      paymentScreenshotLink: req.body.paymentScreenshotLink,
      registrationDate: new Date()
    };
    
   
    const result = await registrationsCollection.insertOne(registration);
    
    console.log(`Registration saved with ID: ${result.insertedId}`);
    
    
    const emailSent = await sendConfirmationEmail(registration);
    
    res.status(201).json({
      success: true,
      message: "Registration successful!",
      registrationId: result.insertedId,
      emailSent: emailSent
    });
    
  } catch (error) {
    console.error("Error processing registration:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later."
    });
  }
});


app.get('/api/registrations', async (req, res) => {
  let db;
  
  try {
    db = await connectToMongoDB();
    const registrationsCollection = db.collection("registrations");
    
    const registrations = await registrationsCollection.find({}).toArray();
    
    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
    
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch registrations."
    });
  }
});


app.get('/api/registrations/event/:eventTitle', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const registrations = await db.collection("registrations")
      .find({ "selectedEvents.title": req.params.eventTitle })
      .toArray();

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error("Error fetching event registrations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event registrations."
    });
  }
});


app.get('/api/registration/search', async (req, res) => {
  let db;
  const { email, rollNo } = req.query;
  
  try {
    db = await connectToMongoDB();
    const registrationsCollection = db.collection("registrations");
    
    let query = {};
    if (email) {
      query.email = email;
    } else if (rollNo) {
      query.rollNo = rollNo;
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide email or roll number for search"
      });
    }
    
    const registration = await registrationsCollection.findOne(query);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "No registration found with the provided details"
      });
    }
    
    res.status(200).json({
      success: true,
      data: registration
    });
    
  } catch (error) {
    console.error("Error searching registration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search registration."
    });
  }
});
app.get('/api',async (req, res) => {
  res.send('Hello from the backend!');
}
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection');
  await client.close();
  process.exit(0);
});