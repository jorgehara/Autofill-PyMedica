def format_patient_list(input_file, output_file):
    """
    Lee una lista de pacientes de un archivo y la formatea según el formato requerido por el popup.
    Formato de entrada: número_afiliado diagnóstico presión_alta presión_baja
    Agrega automáticamente hora y minutos empezando desde 07:30 con intervalos de 15 minutos
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        formatted_lines = []
        current_hour = 7
        current_minute = 30
        
        for line in lines:
            # Limpiar espacios extras y dividir los campos
            fields = line.strip().split()
            if len(fields) == 4:  # Formato original: num_afiliado diagnostico presion_alta presion_baja
                num_afiliado, diagnostico, presion_alta, presion_baja = fields
                
                # Formatear hora y minutos
                hora = str(current_hour).zfill(2)
                minutos = str(current_minute).zfill(2)
                
                # Formatear la línea según el formato requerido
                formatted_line = f"{num_afiliado},{diagnostico},{presion_alta},{presion_baja},{hora},{minutos}"
                formatted_lines.append(formatted_line)
                
                # Actualizar hora y minutos para el siguiente paciente
                current_minute += 15
                if current_minute >= 60:
                    current_minute = 0
                    current_hour += 1
                    
                # Si llegamos a las 12:30, saltamos a las 16:00
                if current_hour == 12 and current_minute > 30:
                    current_hour = 16
                    current_minute = 0
                    
                # Si pasamos las 20:00, volvemos al día siguiente 7:30
                if current_hour >= 20:
                    current_hour = 7
                    current_minute = 30

        # Guardar las líneas formateadas
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(formatted_lines))
            
        print(f"Se han formateado {len(formatted_lines)} registros.")
        print(f"Lista formateada guardada en: {output_file}")
        
        # Mostrar un ejemplo del formato
        if formatted_lines:
            print("\nEjemplo del formato:")
            print(formatted_lines[0])
            print("\nFormato de entrada esperado:")
            print("numero_afiliado diagnostico presion_alta presion_baja")
            print("Ejemplo: 15006000680200 F412 140 90")
            print("\nFormato de salida:")
            print("numero_afiliado,diagnostico,presion_alta,presion_baja,hora,minutos")
            print("Ejemplo: 15006000680200,F412,140,90,07,30")
            
    except Exception as e:
        print(f"Error al procesar el archivo: {str(e)}")

if __name__ == "__main__":
    # Rutas de los archivos
    input_file = "lista_pacientes.txt"  # Archivo con la lista original
    output_file = "lista_formateada.txt"  # Archivo donde se guardará la lista formateada
    
    format_patient_list(input_file, output_file)
