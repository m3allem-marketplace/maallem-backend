const express = require("express");
const todoController = require("./todos.controller");
const { protect } = require("../auth/auth.middleware");

const router = express.Router();

// All todo routes require authentication
router.use(protect);

router
  .route("/")
  .post(todoController.createTodo)
  .get(todoController.getTodos);

router
  .route("/:id")
  .get(todoController.getTodoById)
  .put(todoController.updateTodo)
  .delete(todoController.deleteTodo);

module.exports = router;
