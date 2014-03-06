import psycopg2
import sys


def transform_spot_answer(spot_part, is_last_spot):
    coords_array = spot_part.replace("spot:{", "").replace("}","").replace('"', "")
    coords = coords_array.split(",")

    spot_answer = ""

    if len(coords) < 3:
        spot_answer = spot_part.replace('"', "") 
    else:
        posX = float(coords[0])
        posY = float(coords[1])
        width = float(coords[2])
        centerX = posX + width/2
        centerY = posY + width/2
        spot_answer = "spot:{" + str(centerX) + "," + str(centerY) + "}"

    if (is_last_spot):
        spot_answer += '"'

    return spot_answer


def transform_answer(answer):
    parts = answer.split("~")

    count = 0
    for part in parts:
        count += 1
        if ("spot:{" in part):
            answer = answer.replace(part, transform_spot_answer(part, count == (len(parts))))

    return answer

con = None

try:
    conn_string = "host='localhost' dbname='pybossa' user='postgres' password='postgres'"
    con = psycopg2.connect(conn_string) 
    cursor = con.cursor()
    cursor.execute("SELECT id, info FROM task_run WHERE app_id = 5")
    rows = cursor.fetchall()
    
    for row in rows:
        new_info = transform_answer(row[1])
        print(new_info)
        cursor.execute("UPDATE task_run SET info='" + new_info + "' WHERE id=" + str(row[0]))

    con.commit()

except psycopg2.DatabaseError, e:
    print 'Error %s' % e    
    sys.exit(1) 

finally:
    if con:
        con.close()