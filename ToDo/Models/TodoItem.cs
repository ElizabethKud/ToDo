namespace ToDo.Models
{
    public class TodoItem
    {
        public long Id { get; set; }
        public string Name { get; set; }
        public bool IsComplete { get; set; }
        public string UserId { get; set; } // Для связи с пользователем
        public long? CategoryId { get; set; } // Nullable для связи с категорией
        public ItemCategory? Category { get; set; } // Навигационное свойство
    }
}