const mongoose = require('mongoose');

/**
 * Execute a callback within a MongoDB transaction if replica set is supported,
 * or execute directly if running on a standalone local MongoDB instance.
 */
const runInTransaction = async (workFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const result = await workFn(session);

    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // Ignore abort error if transaction was not active
      }
    }

    // Check if error is because standalone MongoDB does not support transactions
    const isStandaloneError =
      error.message &&
      (error.message.includes('replica set member') ||
       error.message.includes('Transaction numbers are only allowed'));

    if (isStandaloneError) {
      console.warn('MongoDB transactions not supported on standalone instance. Running without session...');
      return await workFn(null);
    }

    throw error;
  } finally {
    if (session) {
      try {
        session.endSession();
      } catch (endErr) {
        // Ignore session end errors
      }
    }
  }
};

module.exports = {
  runInTransaction
};
