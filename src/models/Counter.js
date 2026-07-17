const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

// Atomically returns the next sequence number.
// Ensures the counter never goes below 124451 (the starting point).
counterSchema.statics.nextSeq = async function (id) {
  const FLOOR = 124450; // first nextSeq() call returns 124451
  const doc = await this.findOneAndUpdate(
    { _id: id },
    [{ $set: { seq: { $add: [{ $max: [{ $ifNull: ['$seq', FLOOR] }, FLOOR] }, 1] } } }],
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
