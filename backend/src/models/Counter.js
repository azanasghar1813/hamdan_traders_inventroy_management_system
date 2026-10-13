const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

const getNextSequence = async (sequenceName, prefix = '', padLength = 4, session = null) => {
  const options = { new: true, upsert: true };
  if (session) options.session = session;

  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    options
  );

  const formattedSeq = counter.seq.toString().padStart(padLength, '0');
  return prefix ? `${prefix}-${formattedSeq}` : formattedSeq;
};

module.exports = {
  Counter,
  getNextSequence
};
