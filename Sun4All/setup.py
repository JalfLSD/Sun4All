import pbclient

def contents(filename):
    return file(filename).read()

# settings
pbclient.set('api_key', "c008cbd5-7885-4c49-a0fe-6cdee926651f")
pbclient.set('endpoint', 'http://localhost/pybossa')

# Create the app
#response = pbclient.create_app('Sun for All', 'Sun4All','The aim of the project is the collection of over 30,000 images of the Sun (spectroheliograms) existing at the Astronomical Observatory of the University of Coimbra, the result of work of more than 80 years of daily observations of the Sun started in 1926.');

#update app
pyBossaApp = pbclient.find_app(short_name='Sun4All')[0];
#pyBossaApp.long_description = '- add long description -';
pyBossaApp.info['task_presenter'] = contents('../Site/static/templates/template.html')
pyBossaApp.info['tutorial'] = contents('../Site/static/templates/tutorial.html')
pyBossaApp.info['thumbnail'] = "http://societic.ibercivis.es/sun4all/static/images/icon2.jpg"
pyBossaApp.category_id = 2

pbclient.update_app(pyBossaApp)
