const Todo = require("./todos.model");
const AppError = require("../../utils/AppError");

class TodoService {
  /**
   * Create a new Todo
   */
  async createTodo(userId, todoData) {
    // If a scheduledDate is provided, automatically set status to 'scheduled' if it's currently 'pending'
    if (todoData.scheduledDate && (!todoData.status || todoData.status === "pending")) {
      todoData.status = "scheduled";
    }

    const todo = await Todo.create({
      ...todoData,
      user: userId,
    });
    return todo;
  }

  /**
   * Get all Todos for a user
   */
  async getTodos(userId, filters = {}) {
    const query = { user: userId };
    
    if (filters.status) {
      query.status = filters.status;
    }

    const todos = await Todo.find(query).sort({ createdAt: -1 });
    return todos;
  }

  /**
   * Get a specific Todo by ID
   */
  async getTodoById(userId, todoId) {
    const todo = await Todo.findOne({ _id: todoId, user: userId });
    
    if (!todo) {
      throw new AppError("Todo not found", 404);
    }
    
    return todo;
  }

  /**
   * Update a Todo
   */
  async updateTodo(userId, todoId, updateData) {
    const todo = await Todo.findOne({ _id: todoId, user: userId });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    // Logic for setting status when scheduling
    if (updateData.scheduledDate && (!updateData.status && todo.status === "pending")) {
      updateData.status = "scheduled";
    }

    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return updatedTodo;
  }

  /**
   * Delete a Todo
   */
  async deleteTodo(userId, todoId) {
    const todo = await Todo.findOneAndDelete({ _id: todoId, user: userId });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    return true;
  }
}

module.exports = new TodoService();
