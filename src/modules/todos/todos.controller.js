const catchAsync = require("../../utils/catchAsync");
const { successResponse } = require("../../utils/apiResponse");
const todoService = require("./todos.service");

class TodoController {
  createTodo = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const todoData = req.body;

    const todo = await todoService.createTodo(userId, todoData);

    return res.status(201).json(
      successResponse("Todo created successfully", { todo })
    );
  });

  getTodos = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
    };

    const todos = await todoService.getTodos(userId, filters);

    return res.status(200).json(
      successResponse("Todos retrieved successfully", { todos })
    );
  });

  getTodoById = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const todo = await todoService.getTodoById(userId, id);

    return res.status(200).json(
      successResponse("Todo retrieved successfully", { todo })
    );
  });

  updateTodo = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const updatedTodo = await todoService.updateTodo(userId, id, updateData);

    return res.status(200).json(
      successResponse("Todo updated successfully", { todo: updatedTodo })
    );
  });

  deleteTodo = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    await todoService.deleteTodo(userId, id);

    return res.status(200).json(
      successResponse("Todo deleted successfully")
    );
  });
}

module.exports = new TodoController();
