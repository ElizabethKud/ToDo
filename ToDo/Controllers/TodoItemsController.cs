using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ToDo.Models;

namespace ToDo.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TodoItemsController : ControllerBase
    {
        private readonly TodoContext _context;

        public TodoItemsController(TodoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TodoItem>>> GetTodoItems()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return await _context.TodoItems
                .Where(t => t.UserId == userId)
                .Include(t => t.Category)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TodoItem>> GetTodoItem(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var todoItem = await _context.TodoItems
                .Include(t => t.Category)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (todoItem == null)
            {
                return NotFound();
            }

            return todoItem;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTodoItem(long id, TodoItem todoItem)
        {
            if (id != todoItem.Id)
            {
                return BadRequest();
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var existingItem = await _context.TodoItems.FindAsync(id);
            if (existingItem == null || existingItem.UserId != userId)
            {
                return NotFound();
            }

            // Проверяем, что категория принадлежит пользователю (если указана)
            if (todoItem.CategoryId.HasValue && todoItem.CategoryId > 0)
            {
                var category = await _context.ItemCategories.FindAsync(todoItem.CategoryId);
                if (category == null || category.UserId != userId)
                {
                    return BadRequest("Указанная категория не найдена или не принадлежит пользователю");
                }
            }

            existingItem.Name = todoItem.Name;
            existingItem.IsComplete = todoItem.IsComplete;
            existingItem.CategoryId = todoItem.CategoryId > 0 ? todoItem.CategoryId : null;

            _context.Entry(existingItem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TodoItemExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<TodoItem>> PostTodoItem(TodoItem todoItem)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            todoItem.UserId = userId;

            // Проверяем, что категория принадлежит пользователю (если указана)
            if (todoItem.CategoryId.HasValue && todoItem.CategoryId > 0)
            {
                var category = await _context.ItemCategories.FindAsync(todoItem.CategoryId);
                if (category == null || category.UserId != userId)
                {
                    return BadRequest("Указанная категория не найдена или не принадлежит пользователю");
                }
            }
            else
            {
                todoItem.CategoryId = null;
            }

            _context.TodoItems.Add(todoItem);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTodoItem), new { id = todoItem.Id }, todoItem);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTodoItem(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var todoItem = await _context.TodoItems.FindAsync(id);
            if (todoItem == null || todoItem.UserId != userId)
            {
                return NotFound();
            }

            _context.TodoItems.Remove(todoItem);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool TodoItemExists(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return _context.TodoItems.Any(e => e.Id == id && e.UserId == userId);
        }
    }
}