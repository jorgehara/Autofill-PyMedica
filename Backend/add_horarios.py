def format_time(hour, minute):
    return f"{hour:02d}.{minute:02d}"

def get_next_time(current_hour, current_minute):
    current_minute += 15
    if current_minute >= 60:
        current_minute = 0
        current_hour += 1
    return current_hour, current_minute

def add_horarios(input_file, output_file):
    try:
        # Leer el archivo de entrada
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Inicializar horario
        hour = 7
        minute = 30
        formatted_lines = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Si llegamos a 12:30, saltar a 16:00
            if hour == 12 and minute == 30:
                hour = 16
                minute = 0

            # Si llegamos a 20:00, volver a 7:30
            if hour == 20 and minute == 0:
                hour = 7
                minute = 30

            # Formatear línea con horario
            formatted_line = f"{line},{format_time(hour, minute)}"
            formatted_lines.append(formatted_line)

            # Calcular siguiente horario
            hour, minute = get_next_time(hour, minute)

        # Guardar archivo formateado
        with open(output_file, 'w', encoding='utf-8') as f:
            for line in formatted_lines:
                f.write(line + '\n')

        print(f"Se han procesado {len(formatted_lines)} registros.")
        print("Ejemplos de formato:")
        for i in range(min(3, len(formatted_lines))):
            print(formatted_lines[i])

    except Exception as e:
        print(f"Error al procesar el archivo: {str(e)}")

if __name__ == "__main__":
    input_file = "lista_formateada.txt"
    output_file = "lista_con_horarios.txt"
    add_horarios(input_file, output_file)