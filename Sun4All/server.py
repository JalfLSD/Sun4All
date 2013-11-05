import random
import sys
import pbclient
import mysql.connector
from flask import Flask,make_response, render_template
app = Flask(__name__)

#####################
#internal methods ##
#####################
def get_connection():
    cnx = mysql.connector.connect(user='root', password='S0cye!#02-@gH',
                                host='localhost',
                                database='sun4all');

    return cnx;

def contents(filename):
    return file(filename).read()
    
######################
# web services #######
######################
@app.route('/status')
def check_connection():
    #get try the database connection
    try:
        cnx = get_connection();
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            return "Something is wrong your username or password";
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
                return "Database does not exists";
        else:
            return err;
    else:
        #Get Data
        cursor = cnx.cursor();
        query = ("SELECT count(*) FROM images");
        cursor.execute(query);
        rows = cursor.fetchall();

        cursor.close();
        cnx.close();
        return "database ok!"

@app.route('/setup')
def setup():    
    # settings
    pbclient.set('api_key', "74690b3e-e980-4299-b006-9c6a5c50b355")
    pbclient.set('endpoint', 'http://pybossa.socientize.eu/pybossa')

    # Create the app
    #pbclient.create_app('Semantics Map','Semantics','What is the perceived relation between words? ');
    #update app
    pyBossaApp = pbclient.find_app(short_name='Sun4All')[0];
    #pyBossaApp.long_description = '- add long description -';
    #pyBossaApp.info['task_presenter'] = contents('template.html')
    #pyBossaApp.info['thumbnail'] = "http://societic.ibercivis.es/semantics/static/images/icon.jpg"
    #pyBossaApp.info['tutorial'] = contents('tutorial.html')
    #pbclient.update_app(pyBossaApp)

    #create tasks
    try:
        cnx = get_connection();
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            return "Something is wrong your username or password";
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
                return "Database does not exists";
        else:
            return err;
    else:
        #Get Data
        cursor = cnx.cursor();
        cursor.execute("SELECT * FROM images");
        words = cursor.fetchall();        
        cursor.close();
        cnx.close();

        if (len(words)>0):            
            for item in words:
                    task_info = dict(n_answers=5,
                        start=item[0],
                        end=item[1],
                        startWord=getWord(item[0]),
                        endWord=getWord(item[1]) )
                    pbclient.create_task(pyBossaApp.id, task_info)
        
    return "ok";

if __name__ == '__main__':
    app.run()