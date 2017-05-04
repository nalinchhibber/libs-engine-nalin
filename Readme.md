# Assessment Item Type | Reference Implementation
This repository represents a reference implementation (best practices, seed project, etc.) for implementing new comproDLS assessment item types (for example - Multiple Choice, Single Select). Also known as **engines**, comproDLS&trade; Assessment types are designed to automatically plug-n-play with the following components in the comproDLS&trade; ecosystem:
* **comproDLS&trade; Assessments** (showcase & development bench for assessments)
* **comproDLS&trade; Builder** (authoring courses & product models, with assessments)
* **comproDLS&trade; Test Runner** (embedding assessments in Experience Apps)
* **comproDLS&trade; Activity API** (attempts & state management)
* **comproDLS&trade; Analytics API** (learning & content analytics)

Following sections provide more details on how to setup your own assessment (item type) project and related development, release & integration practices.

## Related documents & references
1. [comproDLS&trade; Product Schema](https://docs.google.com/a/comprotechnologies.com/document/d/1npkT-s7aIWrAi_uXMldWMuX9UWpvhHXTflvi__Pm2jo/edit?usp=sharing) - Read this before defining the underlying schema (instructions, options, interactions, assets/stimulus etc.). While every assessment type will have its own unique schema aspects, some elements are standardized (metadata, question text, scores, feedback, etc.) as per the comproDLS&trade; product schema document.
2. [comproDLS&trade; Assessment Showcase & Development bench](http://assessment.comprodls.com) - Use this portal to review existing assessment types, examples, as well as to develop new assessment types (provide tools for testing and customization).
3. [comproDLS&trade; Test Runner](https://github.com/comprodls/libs-frontend-testrunner) - Use this front-end library to embed assessment types (mix of custom and standard) in your application. This document is more relevant for higher-level use cases (Experience Apps, Integrations).
3. [comproDLS&trade; Activity API](http://activity.comprodls.com) - Used for managing runtime state and attempt history. See https://github.com/comprodls/service-activity/wiki/01_Activity_Concepts for more details. This document is more relevant for higher-level use cases (Experience Apps, Integrations).
4. [comproDLS&trade; Analytics API](http://analytics.comprodls.com)- Once your application is integrated with the ACTIVITY API, learning analytics for user progress & time spent are automatically available via the ANALYTICS API. This document is more relevant for higher-level use cases (Experience Apps, Integrations).


## Getting started - Setup a starter project
1. Choose a unique **comproDLS&trade; code** for your Assessment type (MCQSR, FIB, DND, etc). Refer to **TODO [comproDLS&trade; Registered Assessment Type]()** for existing codes which can't be used.
2. Setup a new GitHub repository using the following standard naming convention - **libs-engine-MY_UNIQUE_CODE** (all lowercase)
3. Copy the contents of this repository into the new repository as the initial commit. Your repository folder structure should look like: 
``` 
src
     js
        <CODE>.js
        <CODE>-editor.js
     css
        <CODE>.css
        <CODE>-editor.css
     html
        <CODE>.html
        <CODE>-editor.html
     json
        <CODE>.json
     assets
 dist     
     <CODE>.js
     <CODE>-editor.js
     assets    
Gruntfile.js
package.json
bower.json
Readme.md
.gitignore
```
4. Rename all the files (as shown above) containing `<CODE>` appropriately. For example if your `CODE` is `QUESTION_TYPE_X` then files under the `js` folder would be renamed to `QUESTION_TYPE_X.js` and `QUESTION_TYPE_X-editor.js`
5. Open the files listed below and replace all references of `MCQ` (all uppercase) with your unique code i.e. `QUESTION_TYPE_X`(all uppercase) and all references of `mcq`(all lowercase) with your unique code i.e. `question_type_x`(all lowercase)
```
src
     js
        <CODE>.js
        <CODE>-editor.js
     css
        <CODE>.css
        <CODE>-editor.css
     html
        <CODE>.html
        <CODE>-editor.html
     json
        <CODE>.json
Gruntfile.js        
```
6. Run the following commands to initialize your project and compile the changed files.
```
npm install
grunt
```
If everything worked fine, you should see an output as follows:
```
	Running "requirejs:engine" (requirejs) task
	Completed requirejs optimization for mcq renderer successfully.

	Running "requirejs:engineEditor" (requirejs) task
	Completed requirejs optimization for mcq editor successfully.

	Running "copy:images" (copy) task
	Copied 1 file
	Done.
```

## Testing your Assessment Type (BASIC flow)
1. Commit and push the above changes to your REMOTE GitHub. Also ensure that your GitHub repository is public (not private) **TODO - solve this**
2. Open http://assessment.comprodls.com and login using your comproDLS&trade; development account.
3. Click on "Register New Item" in the left menu bar.
4. Fill in the register form using your newly created item credentials.
	* **Path** - External item repository path.
	* **Item Type** - Your engine MY_UNIQUE_CODE.
	* **Item Name** - Name you want to give to the item.
	* **Layout** - Each item supports many layouts, Layout here is the name of default layout/variation to be used for the item.
	* **Supports Editor** - Mark NO (in future set to YES, depending on whether your new item supports editor interface or not)
	* **Sample Content** - Copy & Paste contents of your default/sample **question JSON** - `json/<CODE>.json`
11. Click on **Register**, you will be directly taken to a fresh page, where your newly created assessment type will be functioning.


## Typical development process
The typical sequence of steps for developing a new assessment type is as follows.

### Phase 1 - Student/Instructor Experience
* Define a basic UX MOCK/Wireframe - this is help with the subsequent steps for designing your schema and layout.
* Identify your specific schema elements/aspects (which are not already available in comproDLS&trade; Product schema or cannot be mapped to an existing schema construct).
* Define the default/sample **question JSON** - `json/<CODE>.json`. You could use following sample schema as a starting point.
```json
{
    "meta": { 
        "type": "MCQ",
        "title": "Island Survival Test 1",
        "score": {
            "default": 0,
            "max": 1,
            "min": 0
        }
    },
    "content": {
        "instructions": [{
            "tag": "html",
            "html": "Please read the question carefully, and select ONE option as your answer."
        }],
        "canvas": {
            "layout": "MCQ",
            "data": {
                "questiondata": [{
                    "text": "You are alone in a deserted island and about to die. God appears and gives one wish with pre-defined options. Choose the correct answer?"
                }]
            }
        }
    },
    "interactions": {},
    "feedback": {
        "global": {
            "correct": "Well done. You will live.",
            "incorrect": "Sorry, wrong choice, your are about to die.",
            "empty": "Do attempt the question."
        }
    },
    "responses": {},
    "learning-objectives": [],
    "tags": []
}
```
For more information on the above schema elements and their purpose, see https://docs.google.com/document/d/1npkT-s7aIWrAi_uXMldWMuX9UWpvhHXTflvi__Pm2jo/edit#heading=h.lz5q7wlcy4c1


* Based on your UX, define the default layout for your assessment type - `html/<CODE>.html`. Include basic or first-level templating snippets (see http://rivetsjs.com/docs/guide/#usage for details on the RIVETS templating engine) for linking your **question JSON** to your template. Start with the standard schema elements like `content.instructions`, `meta.title` etc. You could use following vanilla template as a starting point.
```html
<div class="well" id="mcq-engine">  <!-- the "id" attribute must set as shown.->
   <!-- Display the Title-->
   <h1 rv-text="jsonContent.meta.title"></h1>
   <!-- Display Instructions-->
   <div rv-each-instruction="jsonContent.content.instructions">
      <p class="lead" rv-text="instruction.html"></p>
   </div>   
   <!-- Display the question-->
   <div rv-each-question="jsonContent.content.canvas.data.questiondata">
      <h6 rv-text="question.text"></h6>
   </div>   
</div>
```
* If necessary add **custom styles** to align with your default template in `css/<CODE>.css`. Note **TODO [Bootstrap 3.3.7]**(https://github.com/twbs/bootstrap) is already included as the baseline styling system. You may skip this step initially and simply leverage default bootstrap styles.
* Now you are ready to start writing your **javascript module** in the files `js/<CODE>.js`. The library  **TODO `jquery 3.2.1`** is available as the baseline. Use the standard AMD module (see http://requirejs.org/docs/whyamd.html#amd ) pattern for specifying additional dependencies. Following is the vanilla starter module which uses RIVETS (for two-way binding and templating).

```javascript
/*
 * -------------
 * Engine Module
 * -------------
 * 
 * Item Type: MCQ Single Choice Quesion engine
 * Code: MCQ
 * Interface: ENGINE
 
 *  ENGINE Interface public functions
 *  {
 *          init(),
 *          getStatus(),
 *          getConfig()
 *  }
 * 
 *
 * This engine is designed to be loaded dynamical by other applications (or  platforms). At the starte the function [ engine.init() ] will be called  with necessary configuration paramters and a reference to platform "Adapter"  which allows subsequent communuication with the platform.
 *
 * The function [ engine.getStatus() ] may be called to check if SUBMIT has been pressed or not - the response from the engine is used to enable / disable appropriate platform controls.
 *
 * The function engine.getConfig() is called to request SIZE information - the response from the engine is used to resize & display the container iframe.
 *
 *
 * EXTERNAL JS DEPENDENCIES : ->
 * Following are shared/common dependencies and assumed to loaded via the platform. The engine code can use/reference these as needed
 * 1. JQuery (2.1.1)
 * 2. Boostrap (TODO: version) 
 */
define(['text!../html/mcq.html', //layout(s) template representing the UX
        'rivets',  // Rivets for data binding
        'sightglass'], //Required by Rivets
        function (mcqTemplateRef) {

    mcq = function() {
    
    "use strict";
        
    /*
     * Reference to platform's activity adaptor (passed during init() ).
     */
    var activityAdaptor;     
    
    /*
     * Internal Engine Config.
     */ 
    var __config = {
        MAX_RETRIES: 10, /* Maximum number of retries for sending results to platform for a particular activity. */ 
        RESIZE_MODE: "auto", /* Possible values - "manual"/"auto". Default value is "auto". */
        RESIZE_HEIGHT: "580" /* Applicable, if RESIZE_MODE is manual. If RESIZE_HEIGHT is defined in TOC then that will overrides. */
        /* If both config RESIZE_HEIGHT and TOC RESIZE_HEIGHT are not defined then RESIZE_MODE is set to "auto"*/
    };
    
    /*
     * Internal Engine State - used to manage/track current status of the assessment.
     */ 
    var __state = {
        activityPariallySubmitted: false, /* State whether activity has been partially submitted. Possible Values: true/false(Boolean) */
        activitySubmitted: false /* State whether activity has been submitted. Possible Values: true/false(Boolean) */
    };  

    /*
     * Constants.
     */
    var __constants = {
        TEMPLATES: {
            /* Regular MCQ Layout */
            MCQ: mcqTemplateRef
        }
    };
        
    /********************************************************/
    /*                  INIT FUNCTION
        
        "elRoot" :->        DOM Element reference where the engine should paint itself.                                                     
        "params" :->        Startup params passed by platform. 
        "adaptor" :->        An adaptor interface for communication with platform (__saveResults, closeActivity, savePartialResults, getLastResults, etc.).
        "htmlLayout" :->     HTML layout  
        "jsonContent" :->    Question JSON 
        "callback" :->      Function to inform platform that init is complete.
    */
    /********************************************************/  
    function init(elRoot, params, adaptor, htmlLayout, questionJSON, callback) {        
        //Store the adaptor  
        activityAdaptor = adaptor;

        //Clone question JSON so that original is preserved.
        var jsonContent = jQuery.extend(true, {}, questionJSON);
        
        /* Apply the layout HTML to the dom */
        $(elRoot).html(__constants.TEMPLATES[htmlLayout]);

        /* Process the template by initializing RIVETs */
         rivets.bind($('#mcq-engine'), {
            jsonContent: jsonContent
        });
        
        /* Inform the Platform that init is complete */
        if(callback) {
            callback();
        }                               
        
    } /* init() Ends. */        
    
    /* ---------------------- PUBLIC FUNCTIONS --------------------------------*/
    /**
     * ENGINE Interface
     *
     * Return configuration
     */
    function getConfig () {
        return __config;
    }
    
    /**
     * ENGINE Interface
     *
     * Return the current state (Activity Submitted/ Partial Save State.) of activity.
     */
    function getStatus() {
        return __state.activitySubmitted || __state.activityPariallySubmitted;
    }


    return {
        /*Engine Interface*/
        "init": init, /* Shell requests the engine intialized and render itself. */
        "getStatus": getStatus, /* Shell requests a gradebook status from engine, based on its current state. */
        "getConfig" : getConfig, /* Shell requests a engines config settings.  */
        "handleSubmit" : function() {/* Do Nothing for now. Sample only*/},
        "showGrades": function() {/* Do Nothing for now. Sample only*/},
        "updateLastSavedResults": function() {/* Do Nothing for now. Sample only*/}
    };
    };
});
```
* Commit your code and test using http://assessment.comprodls.com. NOTE, at the time of registration, **Specify SUPPORT EDITOR as false**


### Phase 2 - Authoring Experience
TODO

## Understanding the ENGINE interface
The AMD **javascript module** conform to a standard **ENGINE interface** which ensures that your assesment type can be embedded and integrated across various comproDLS apps and components
* comproDLS&trade; Assessments (assessment.comprodls.com)
* comproDLS&trade; Builder 
* comproDLS&trade; Test Runner (widget for embedding assessments in Experience Apps)
* comproDLS&trade; Activity API (attempts & state management)
* comproDLS&trade; Analytics API (learning & content analytics)

### Public Methods 
These methods must be defined, as they will invoked by the platform.

### init()
### getConfig()
### getStatus()

### Events 
The engine can contact the platform via the following functions available in the adaptor object.

### X
### Y


## Understanding the EDITOR interface
TODO


## DO's & DONT's
* Do not inject your own Jquery and Bootstrap. If you need a new version of these dependencies, contact the Iron Fist for more details.
* ..
* ..
* ..
* ..
* ..

## Integrating your Assessment type(s) with your Delivery Application
An assessment type may be used in various modes:
* Single or Multi-question tests with **NO state/history** - Simply use the [Test Runner](https://github.com/comprodls/libs-frontend-testrunner)) to embed your assesment type as a widget. You will need to supply content (question json).
* Single or Multi-question tests **with state/history** (Attempts, Resume, Past scores etc.)- Requires use of comproDLS&trade; PRODUCT & ACTIVITY APIs in coordination with the Test runner.
* **Embedded test** inside text/html/epub/markdown with **NO state/history** - Simply use the [Test Runner](https://github.com/comprodls/libs-frontend-testrunner))
* **Embedded test** inside text/html/epub/markdown **with state/history** - Requires use of comproDLS&trade; PRODUCT & ACTIVITY APIs in coordination with the Test runner. _TODO Embedded Items_

## Integrating your Assessment type(s) with Builder
TODO
 


