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
        
        // Временно делаем поле Status nullable для совместимости
        public TodoStatus? Status { get; set; }
        
        // Основное поле для совместимости с существующей БД
        public bool IsComplete { get; set; }
        
        public string UserId { get; set; } = string.Empty;
        
        public long? CategoryId { get; set; }
        
        public ItemCategory? Category { get; set; }
        
        // Вычисляемое свойство для получения статуса
        [JsonIgnore]
        public TodoStatus CurrentStatus 
        { 
            get 
            {
                // Если Status установлен, используем его
                if (Status.HasValue)
                    return Status.Value;
                
                // Иначе конвертируем из IsComplete
                return IsComplete ? TodoStatus.Completed : TodoStatus.NotStarted;
            }
            set
            {
                Status = value;
                IsComplete = value == TodoStatus.Completed;
            }
        }
    }
}