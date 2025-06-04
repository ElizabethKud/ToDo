using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToDo.Models
{
    public enum TodoStatus
    {
        NotStarted = 0,    // Не выполнено
        InProgress = 1,    // В процессе
        Completed = 2      // Выполнено
    }

    public class TodoItem
    {
        public long Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public TodoStatus Status { get; set; } = TodoStatus.NotStarted;
        
        // Оставляем для совместимости, но используем Status
        public bool IsComplete 
        { 
            get => Status == TodoStatus.Completed;
            set => Status = value ? TodoStatus.Completed : TodoStatus.NotStarted;
        }
        
        public string UserId { get; set; } = string.Empty;
        
        public long? CategoryId { get; set; }
        
        public ItemCategory? Category { get; set; }
    }
}