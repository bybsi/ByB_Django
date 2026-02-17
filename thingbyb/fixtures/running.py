import os
import sys
from subprocess import Popen, PIPE

if len(sys.argv) != 2:
    print("Missing number of rows.")
    sys.exit(0)

count = int(sys.argv[1])

try:
    filepath = 'running.csv'
    out_file = 'tmp.sql'
    output = ''
    with open(filepath, 'r') as fh, open(out_file, 'w') as fh_out:
        fh_out.write("INSERT INTO activities_activity (type,title,date,distance,time,heart_rate,avg_pace,best_pace,ascent,descent) VALUES")
        next(fh)
        for line in fh:
            line = line.replace('"','')
            (t, timestamp, _, title, distance, _, time, heart_rate, _, _, _, avg_pace, best_pace, ascent, descent, _stl, _,_,_,_,_,_,_,moving_time, _rest) = line.rstrip().split(',', 24)
            count -= 1
            if 'walking' in t.lower():
                continue
            output += "('{}','{}','{}','{}','{}','{}','{}','{}','{}','{}')".format(
                    t,
                    title,
                    timestamp,
                    float(distance) if distance[0].isdigit() else 0.0,
                    moving_time,
                    int(heart_rate) if heart_rate[0].isdigit() else 0,
                    avg_pace,
                    best_pace,
                    int(ascent) if ascent[0].isdigit() else 0,
                    int(descent) if descent[0].isdigit() else 0
                )
            if count == 0:
                output += ";\n"
                break
            output += ",\n"
        fh_out.write(output)

    if os.path.isfile(out_file):
        with open(out_file, 'r') as fh:
            p = Popen(['mysql', '-u' , 'root', '--password=""', 'thingbyb_django'], stdin=fh)
            out, err = p.communicate()
        os.unlink(out_file)
    else:
        print("Could not write input file")
    #os.system('mysql -u root -p thingbyb < %s' % out_file)
except Exception as exc:
    print(exc)

