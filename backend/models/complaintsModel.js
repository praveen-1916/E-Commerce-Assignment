import { model, Schema } from "mongoose";

// Complaints Schema
const complaintsSchema = new Schema({
  complaintNumber: String,
  name: String,
  email: String,
  message: String,
  userType: String,
  status: {
    type: String,
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Complaint = model("Complaint", complaintsSchema);
export default Complaint;
