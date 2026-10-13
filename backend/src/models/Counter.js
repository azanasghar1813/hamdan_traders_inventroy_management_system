const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Generates the next sequential unique number with zero padding and optional prefix.
 * Automatically synchronizes with existing records in the target collection so it
 * never collides with legacy documents or duplicates.
 *
 * @param {string} sequenceName - ID of the counter ('purchase_invoice', 'sale_invoice', etc.)
 * @param {string} prefix - Optional prefix (e.g. 'PUR', 'INV')
 * @param {number} padLength - Minimum digits to zero pad (default 4)
 * @param {object} session - Mongoose transaction session (optional)
 * @param {object} Model - Mongoose model to verify uniqueness against (optional)
 * @param {string} fieldName - Model field name containing the sequence (optional)
 */
const getNextSequence = async (
  sequenceName,
  prefix = '',
  padLength = 4,
  session = null,
  Model = null,
  fieldName = null
) => {
  const options = { new: true, upsert: true };
  if (session) options.session = session;

  let resolvedModel = Model;
  let resolvedField = fieldName;

  if (!resolvedModel) {
    if (sequenceName === 'purchase_invoice') {
      try {
        resolvedModel = mongoose.model('Purchase');
      } catch {
        resolvedModel = require('./Purchase');
      }
      resolvedField = 'purchaseNumber';
    } else if (sequenceName === 'sale_invoice') {
      try {
        resolvedModel = mongoose.model('Sale');
      } catch {
        resolvedModel = require('./Sale');
      }
      resolvedField = 'invoiceNumber';
    }
  }

  // 1. Initial sync: Check if counter document exists and if its sequence is at least
  // as high as any existing document in the target collection.
  if (resolvedModel && resolvedField) {
    try {
      let counterQuery = Counter.findById(sequenceName);
      if (session) counterQuery = counterQuery.session(session);
      const counterDoc = await counterQuery;
      const currentSeq = counterDoc ? (counterDoc.seq || 0) : 0;

      // Find documents matching prefix pattern
      const prefixRegex = prefix ? new RegExp(`^${prefix}-(\\d+)$`) : /^(\d+)$/;
      let docsQuery = resolvedModel.find(
        { [resolvedField]: { $regex: prefix ? `^${prefix}-` : '^\\d+' } },
        { [resolvedField]: 1 }
      );
      if (session) docsQuery = docsQuery.session(session);
      const docs = await docsQuery.lean();

      let maxExistingNum = 0;
      for (const doc of docs) {
        const val = doc[resolvedField];
        if (val) {
          const m = String(val).match(prefixRegex);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num > maxExistingNum) {
              maxExistingNum = num;
            }
          }
        }
      }

      if (maxExistingNum > currentSeq) {
        await Counter.findByIdAndUpdate(
          sequenceName,
          { $set: { seq: maxExistingNum } },
          options
        );
      }
    } catch (syncErr) {
      console.warn(`Counter initial sync warning for ${sequenceName}:`, syncErr.message);
    }
  }

  // 2. Loop until a unique, non-colliding candidate is generated
  let nextFormatted = '';
  let candidateExists = true;
  let attempts = 0;

  while (candidateExists && attempts < 1000) {
    attempts++;
    const counter = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } },
      options
    );

    const formattedSeq = counter.seq.toString().padStart(padLength, '0');
    nextFormatted = prefix ? `${prefix}-${formattedSeq}` : formattedSeq;

    if (resolvedModel && resolvedField) {
      let existsQuery = resolvedModel.exists({ [resolvedField]: nextFormatted });
      if (session) existsQuery = existsQuery.session(session);
      const exists = await existsQuery;
      if (!exists) {
        candidateExists = false;
      }
    } else {
      candidateExists = false;
    }
  }

  return nextFormatted;
};

module.exports = {
  Counter,
  getNextSequence
};
