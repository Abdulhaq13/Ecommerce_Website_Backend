//used to avoid using try catch everytime
const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      //it is send to app.use(errorHandler) in app.js
      next(error);
    }
  };
};
export default asyncHandler;
