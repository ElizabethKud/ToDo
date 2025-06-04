using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ToDo.Models;

var builder = WebApplication.CreateBuilder(args);

// Настройка логирования
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Настройка подключения к PostgreSQL
string? connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<TodoContext>(options =>
    options.UseNpgsql(connectionString));

// Настройка Identity с упрощенными требованиями к паролю
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
    // Упрощенные требования к паролю для тестирования
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 4;
    options.Password.RequiredUniqueChars = 1;

    // Настройки пользователя
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
    options.User.RequireUniqueEmail = true;

    // Отключаем подтверждение email для упрощения
    options.SignIn.RequireConfirmedEmail = false;
})
.AddEntityFrameworkStores<TodoContext>()
.AddDefaultTokenProviders();

// Настройка аутентификации с JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])),
        ClockSkew = TimeSpan.Zero
    };

    // Добавляем логирование для JWT
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError("Authentication failed: {Error}", context.Exception.Message);
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogInformation("Token validated for user: {User}", context.Principal?.Identity?.Name);
            return Task.CompletedTask;
        }
    };
});

// Настройка CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// Настройка контроллеров с JSON опциями для обработки циклических ссылок
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
        // Обработка циклических ссылок
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

var app = builder.Build();

// Middleware для логирования всех запросов
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    logger.LogInformation($"Request: {context.Request.Method} {context.Request.Path}");
    
    if (context.Request.Method == "POST" && context.Request.Path.StartsWithSegments("/api"))
    {
        logger.LogInformation($"POST request to: {context.Request.Path}");
        logger.LogInformation($"Content-Type: {context.Request.ContentType}");
        logger.LogInformation($"Authorization header: {context.Request.Headers.Authorization}");
        
        // Читаем тело запроса для логирования
        context.Request.EnableBuffering();
        var body = await new StreamReader(context.Request.Body).ReadToEndAsync();
        context.Request.Body.Position = 0;
        logger.LogInformation($"Request body: {body}");
    }
    
    await next();
    
    logger.LogInformation($"Response: {context.Response.StatusCode}");
});

// Указываем, что index.html - файл по умолчанию
app.UseDefaultFiles(new DefaultFilesOptions { DefaultFileNames = new[] { "index.html" } });
app.UseStaticFiles();

app.UseHttpsRedirection();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();