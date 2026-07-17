const catchAsync = require("../../utils/catchAsync");
const { sendResponse } = require("../../utils/apiResponse");
const todoService = require("./todos.service");

class TodoController {
  createTodo = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const todoData = req.body;

    const todo = await todoService.createTodo(userId, todoData);

    return sendResponse(res, 201, { todo }, "Todo created successfully");
  });

  getTodos = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
    };

    const todos = await todoService.getTodos(userId, filters);

    return sendResponse(res, 200, { todos }, "Todos retrieved successfully");
  });

  getTodoById = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const todo = await todoService.getTodoById(userId, id);

    return sendResponse(res, 200, { todo }, "Todo retrieved successfully");
  });

  updateTodo = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const updatedTodo = await todoService.updateTodo(userId, id, updateData);

    return sendResponse(res, 200, { todo: updatedTodo }, "Todo updated successfully");
  });

  deleteTodo = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    await todoService.deleteTodo(userId, id);

    return sendResponse(res, 200, null, "Todo deleted successfully");
  });
}

module.exports = new TodoController();
