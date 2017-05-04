/*
 * ----------------------
 * Engine Module Renderer
 * ----------------------
 * 
 * Item Type: MCQ Single Choice Quesion engine
 * Code: MCQ
 * Interface: Renderer
 *  
 * Item Render Interfaces / Modes :->
 * 
 *  1. Supports Standard ENGINE-SHELL interface
 *      {
 *          init(),
 *          getStatus(),
 *          getConfig()
 *      }
 * 
 * ENGINE - SHELL interface : ->
 *
 * This engine loaded by another module/js "shell.js" which  establishes interface with the platform. The shell instantiates
 * this engine [ engine.init() ]  with necessary configuration paramters and a reference to platform Adapter
 * object which allows subsequent communuication with the platform.
 *
 * SHELL calls [ engine.getStatus() ] to check if SUBMIT has been pressed or not - the response from the engine is 
 * used to enable / disable LMS controls.
 *
 * SHELL calls engine.getConfig() to request SIZE information - the response from the engine is 
 * used to resize the container iframe.
 *
 *
 * EXTERNAL JS DEPENDENCIES : ->
 * Following are shared/common dependencies and assumed to loaded via the platform. The engine code can use/reference
 * these as needed
 * 1. JQuery (2.1.1)
 * 2. Handlebars (1.0.0)
 * 3. Boostrap (TODO: version) 
 */

define(['text!../html/mcq.html', //HTML layout(s) template (handlebars/rivets) representing the rendering UX
        'css!../css/mcq.css',  //Custom styles of the engine (applied over bootstrap & front-end-core)
        'rivets',  // Rivets for data binding
        'sightglass'], //Required by Rivets
        function (mcqTemplateRef) {

    mcq = function() {
    
    "use strict";
        
    /*
     * Reference to platform's activity adaptor (initialized during init() ).
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
     * Internal Engine State.
     */ 
    var __state = {
        currentTries: 0, /* Current try of sending results to platform */
        activityPariallySubmitted: false, /* State whether activity has been partially submitted. Possible Values: true/false(Boolean) */
        activitySubmitted: false, /* State whether activity has been submitted. Possible Values: true/false(Boolean) */
        radioButtonClicked: false /* State whether radio button is clicked.  Possible Values: true/false(Boolean) */   
    };  
    
    /*
     * Content (loaded / initialized during init() ).
     */ 
    var __content = {
        directionsJSON: "",
        questionsJSON: [], /* Contains the question obtained from content JSON. */
        optionsJSON: [], /* Contains all the options for a particular question obtained from content JSON. */
        answersJSON: [], /* Contains the answer for a particular question obtained from content JSON. */
        userAnswersJSON: [], /* Contains the user answer for a particular question. */
        activityType: null  /* Type of FIB activity. Possible Values :- FIBPassage.  */    
    };

    /*
     * Constants.
     */
    var __constants = {
        /* CONSTANT for HTML selectors */ 
        DOM_SEL_ACTIVITY_BODY: ".activity-body",
        
        /* CONSTANT for identifier in which Adaptor Instance will be stored */
        ADAPTOR_INSTANCE_IDENTIFIER: "data-objectid",
        
        /* CONSTANT for PLATFORM Save Status NO ERROR */
        STATUS_NOERROR: "NO_ERROR",

        /* CONSTANT to end test. */
        END_TEST: false,
        
        TEMPLATES: {
            /* Regular MCQ Layout */
            MCQ: mcqTemplateRef
        }
    };
    // Array of all interaction tags in question
    var __interactionIds = [];
    var __processedJsonContent;
        
    /********************************************************/
    /*                  ENGINE-SHELL INIT FUNCTION
        
        "elRoot" :->        DOM Element reference where the engine should paint itself.                                                     
        "params" :->        Startup params passed by platform. Include the following sets of parameters:
                        (a) State (Initial launch / Resume / Gradebook mode ).
                        (b) TOC parameters (videoRoot, contentFile, keyframe, layout, etc.).
        "adaptor" :->        An adaptor interface for communication with platform (__saveResults, closeActivity, savePartialResults, getLastResults, etc.).
        "htmlLayout" :->    Activity HTML layout (as defined in the TOC LINK paramter). 
        "jsonContent" :->    Activity JSON content (as defined in the TOC LINK paramter).
        "callback" :->      To inform the shell that init is complete.
    */
    /********************************************************/  
    function init(elRoot, params, adaptor, htmlLayout, jsonContentObj, callback) {        

        /* ---------------------- BEGIN OF INIT ---------------------------------*/
        //Store the adaptor  
        activityAdaptor = adaptor;

        //Clone the JSON so that original is preserved.
        var jsonContent = jQuery.extend(true, {}, jsonContentObj);
        
        /* ------ VALIDATION BLOCK START -------- */    
        if (jsonContent.content === undefined) {
            if(callback) {
                callback();
            }       
            //TODO - In future more advanced schema validations could be done here        
            return; /* -- EXITING --*/
        }
        
        /* ------ VALIDATION BLOCK END -------- */        
        
        /* Parse and update content JSON. */
        __processedJsonContent = __parseAndUpdateJSONContent(jsonContent, params, htmlLayout);
        //Process JSON for easy iteration in template
        //__parseAndUpdateJSONForRivets();
        __parseAndUpdateJSONForRivets(__processedJsonContent);

        /* Apply the layout HTML to the dom */
        $(elRoot).html(__constants.TEMPLATES[htmlLayout]);

        /* Initialize RIVET. */
        __initRivets();
        /* ---------------------- SETUP EVENTHANDLER STARTS----------------------------*/
            
        $('input[id^=option]').change(__handleRadioButtonClick); 

        $(document).bind('userAnswered', function() {
            __saveResults(false);
        });

        /* ---------------------- SETUP EVENTHANDLER ENDS------------------------------*/

        /* Inform the shell that init is complete */
        if(callback) {
            callback();
        }                               
        
        /* ---------------------- END OF INIT ---------------------------------*/
    } /* init() Ends. */        
    /* ---------------------- PUBLIC FUNCTIONS --------------------------------*/
    /**
     * ENGINE-SHELL Interface
     *
     * Return configuration
     */
    function getConfig () {
        return __config;
    }
    
    /**
     * ENGINE-SHELL Interface
     *
     * Return the current state (Activity Submitted/ Partial Save State.) of activity.
     */
    function getStatus() {
        return __state.activitySubmitted || __state.activityPariallySubmitted;
    }
    
    /**
    * Bound to click of Activity submit button.
    */
    function handleSubmit(event){
        /* Saving Answer. */
        __saveResults(true);

        /* Marking Answers. */
        if (activityAdaptor.showAnswers) {
            __markAnswers();
        }

        $('input[id^=option]').attr("disabled", true);
    }

    /**
    * Function to show user grades.
    */
    function showGrades(savedAnswer, reviewAttempt){
        /* Show last saved answers. */
        updateLastSavedResults(savedAnswer);
        /* Mark answers. */
        __markAnswers();
        $('input[id^=option]').attr("disabled", true);      
    } 

    /**
     * Function to display last result saved in LMS.
     */ 
    function updateLastSavedResults(lastResults) {
        $.each(lastResults.results, function(num) {
            __content.userAnswersJSON[num] = this.answer.trim();
            for(var i = 0; i < $('input[id^=option]').length; i++) {
                if($('input[id^=option]')[i].value.trim() === this.answer.trim()) {
                    $('input[id^=option]')[i].checked = true;
                    break;
                }
            }
        });
    }
    /* ---------------------- PUBLIC FUNCTIONS END ----------------------------*/
     

    /* ---------------------- PRIVATE FUNCTIONS -------------------------------*/

     /* ---------------------- JSON PROCESSING FUNCTIONS START ---------------------------------*/
     /**
     * Parse and Update JSON based on MCQ specific requirements.
     */
    function __parseAndUpdateJSONContent(jsonContent, params, htmlLayout) { 
        jsonContent.content.displaySubmit = activityAdaptor.displaySubmit;   
        
        __content.activityType = params.engineType;
        __content.layoutType = jsonContent.content.canvas.layout;

        /* Activity Instructions. */
        var tagName = jsonContent.content.instructions[0].tag;
        __content.directionsJSON = jsonContent.content.instructions[0][tagName];
        /* Put directions in JSON. */
        jsonContent.content.directions = __content.directionsJSON;
        $.each(jsonContent.content.stimulus, function(i) {
            if(this.tag === "image") {
                jsonContent.content.stimulus.mediaContent = params.questionMediaBasePath + this.image;
            }
        });
        __parseAndUpdateQuestionSetTypeJSON(jsonContent);
        
        /* Returning processed JSON. */
        return jsonContent; 
    }

    
    /**
     * Parse and Update Question Set type JSON based on  MCQ specific requirements.
     */  
    function __parseAndUpdateQuestionSetTypeJSON(jsonContent) {

        /* Extract interaction id's and tags from question text. */
        var interactionId = "";
        var interactionTag = "";
        /* String present in href of interaction tag. */
        var interactionReferenceString = "http://www.comprodls.com/m1.0/interaction/mcq";
        /* Parse questiontext as HTML to get HTML tags. */
        var parsedQuestionArray = $.parseHTML(jsonContent.content.canvas.data.questiondata[0].text);
        $.each( parsedQuestionArray, function(i, el) {
          if(this.href === interactionReferenceString) {
            interactionId = this.childNodes[0].nodeValue.trim();
            __interactionIds.push(interactionId);
            interactionTag = this.outerHTML;
            interactionTag = interactionTag.replace(/"/g, "'");
          }
        });
        /* Replace interaction tag with blank string. */
        jsonContent.content.canvas.data.questiondata[0].text = jsonContent.content.canvas.data.questiondata[0].text.replace(interactionTag,"");
        var questionText = "1.  " + jsonContent.content.canvas.data.questiondata[0].text;
        var correctAnswerNumber = jsonContent.responses[interactionId].correct;
        var interactionType = jsonContent.content.interactions[interactionId].type;
        var optionCount = jsonContent.content.interactions[interactionId][interactionType].length;

        /* Make optionsJSON and answerJSON from JSON. */
        for(var i = 0; i < optionCount; i++) {
            var optionObject = jsonContent.content.interactions[interactionId][interactionType][i];
            var option = optionObject[Object.keys(optionObject)].replace(/^\s+|\s+$/g, '');
            __content.optionsJSON.push(__getHTMLEscapeValue(option));
            optionObject[Object.keys(optionObject)] = option;
            /* Update JSON after updating option. */
            jsonContent.content.interactions[interactionId][interactionType][i] = optionObject;
            if(Object.keys(optionObject) == correctAnswerNumber) {
                __content.answersJSON[0] = optionObject[Object.keys(optionObject)];
            }
        }
        __content.questionsJSON[0] = questionText + " ^^ " + __content.optionsJSON.toString() + " ^^ " + interactionId;       
    }
    
    /**
     * Escaping HTML codes from String.
     */
    function __getHTMLEscapeValue(content) {  
        var tempDiv = $("<div></div>");
        $(tempDiv).html(content);
        $("body").append(tempDiv);
        content  = $(tempDiv).html();
        $(tempDiv).remove();    
        return content;
    }      

    /***
     * Function to modify question JSON for easy iteration in template
     * 
     * Original JSON Object
     * ---------------------
     * 
     * "MCQ": [
          {
            "choiceA": "She has the flu." 
          },
          {
            "choiceB": "She has the measles."
          }  
        ]

        Modified JSON Object
        ----------------------

        "MCQ": [
          {
              "customAttribs" : {
                    "key" : "choiceA",
                    "value" : "She has the flu.",
                    "isEdited" : false,
                    "index" : 0
                    "isCorrect" : false
              } 
          },
           {
              "customAttribs" : {
                    "key" : "choiceB",
                    "value" : "She has the measles.",
                    "isEdited" : false,
                    "index" : 1
                    "isCorrect" : true
              } 
          }  
        ]
     */
    function __parseAndUpdateJSONForRivets(jsonContent){  
       var processedArray = [];
       for(var i=0; i <__interactionIds.length; i++){
            jsonContent.content.interactions[__interactionIds[i]].MCQ.forEach(function(obj, index){
                var processedObj = {};
                processedObj.customAttribs = {};
                Object.keys(obj).forEach(function(key){
                    processedObj.customAttribs.key = key;
                    processedObj.customAttribs.value = obj[key];
                });
                processedArray.push(processedObj);
            });
            jsonContent.content.interactions[__interactionIds[i]].MCQ = processedArray;  
       }
    } 

    /*------------------------RIVET INITIALIZATION & BINDINGS -------------------------------*/        
    function __initRivets(){
        /* Formatter to transform object into object having 'key' property with value key
         * and 'value' with the value of the object
         * Example:
         * var obj = {'choiceA' : 'She has flu.'} to
         * obj= { 'key' : 'choiceA', 'value' : 'She has flu.'}
         * This is done to access the key and value of object in the template using rivets.
         */
        rivets.formatters.propertyList = function(obj) {
          return (function() {
            var properties = [];
            for (var key in obj) {
              properties.push({key: key, value: obj[key]})
            }
            return properties
          })();
        }

        /* This formatter is used to append interaction property to the object
         * and return text of the question for particular interaction
         */
        rivets.formatters.appendInteraction = function(obj, interaction, MCQ){
            return obj[interaction].text;
        }

        /* This formatter is used to return the array of options for a particular
         * interaction so that rivets can iterate over it.
         */
        rivets.formatters.getArray = function(obj, interaction){
            return obj[interaction].MCQ;
        }

        var isMCQImageEngine = false;
        /* Find if layout is of type MCQ_IMG*/
        if(__content.layoutType == 'MCQ_IMG'){
            isMCQImageEngine = true;
        }

        /*Bind the data to template using rivets*/
        rivets.bind($('#mcq-engine'), {
            content: __processedJsonContent.content,
            isMCQImageEngine: isMCQImageEngine
        });
    }

    /*------------------------RIVETS END-------------------------------*/

    /* ---------------------- JQUERY BINDINGS ---------------------------------*/
    /**
    * Function to handle radio button click.
    */
    function __handleRadioButtonClick(event){
        /*
         * Soft save here
         */
        var currentTarget = event.currentTarget;
        
        $("label.radio").parent().removeClass("highlight");
        $(currentTarget).parent().parent("li").addClass("highlight");  
        
        var newAnswer = currentTarget.value.replace(/^\s+|\s+$/g, '');
            
        /* Save new Answer in memory. */
        __content.userAnswersJSON[0] = newAnswer.replace(/^\s+|\s+$/g, '');  
        
        __state.radioButtonClicked = true;
        
        var interactionId = __content.questionsJSON[0].split("^^")[2].trim();

        $(document).triggerHandler('userAnswered');
    }   

    /**
     * Function called to send result JSON to adaptor (partial save OR submit).
     * Parameters:
     * 1. bSumbit (Boolean): true: for Submit, false: for Partial Save.
     */
    function __saveResults(bSubmit){
        
        var activityBodyObjectRef = $(__constants.DOM_SEL_ACTIVITY_BODY).attr(__constants.ADAPTOR_INSTANCE_IDENTIFIER); 
        /*Getting answer in JSON format*/
        var answerJSON = __getAnswersJSON(false);

        if(bSubmit===true) {/*Hard Submit*/

            /*Send Results to platform*/
            activityAdaptor.submitResults(answerJSON, activityBodyObjectRef, function(data, status){
                if(status=== __constants.STATUS_NOERROR){
                    __state.activitySubmitted = true;
                    /*Close platform's session*/
                    activityAdaptor.closeActivity();
                    __state.currentTries = 0;
                } else {
                    /* There was an error during platform communication, so try again (till MAX_RETRIES) */             
                    if(__state.currentTries < __config.MAX_RETRIES) {
                        __state.currentTries++ ;
                        __saveResults(bSubmit);
                    }

                }

            });
        } else{ /*Soft Submit*/
            /*Send Results to platform*/
            activityAdaptor.savePartialResults(answerJSON, activityBodyObjectRef, function(data, status){
                if(status=== __constants.STATUS_NOERROR){
                    __state.activityPariallySubmitted = true;
                } else {
                    /* There was an error during platform communication, do nothing for partial saves */
                }
            });
        }
    }    

    /*------------------------OTHER PRIVATE FUNCTIONS------------------------*/

    /**
     * Function to show correct Answers to User, called on click of Show Answers Button.
     */ 
    function __markAnswers(){
        var radioNo = "";
        /* Looping through answers to show correct answer. */
        for(var i = 0; i < __content.optionsJSON.length; i++){
           radioNo = "" + i;
           __markRadio(radioNo, __content.answersJSON[0], __content.optionsJSON[i]);
        }
        
    }
    /* Add correct or wrong answer classes*/
    function __markRadio(optionNo, correctAnswer, userAnswer) {    
        if(userAnswer.trim() === correctAnswer.trim()) {
            $($(".answer")[optionNo]).removeClass("wrong");
            $($(".answer")[optionNo]).addClass("correct");
            $($(".answer")[optionNo]).parent().addClass("state-success");
        } else {
            $($(".answer")[optionNo]).removeClass("correct");
            $($(".answer")[optionNo]).addClass("wrong");
            $($(".answer")[optionNo]).parent().addClass("state-error");
        }
        $(".answer" + optionNo).removeClass("invisible");
    }
    
    /**
     *  Function used to create JSON from user Answers for submit(soft/hard).
     *  Called by :-
     *   1. __saveResults (internal).
     *   2. Multi-item-handler (external).
     */  
    function __getAnswersJSON(skipQuestion){

        var score = 0;
        var answer = "";
        var results = {};
        var end_current_test = false;
        
        /*Setup results array */
        var resultArray = new Array(1);
        /* Split questionJSON to get interactionId. */
        var questionData = __content.questionsJSON[0].split("^^");
        var interactionId = questionData[2].trim();
        if(__constants.END_TEST) {
            end_current_test = true;
        }
        if (skipQuestion) {
            answer = "Not Answered";
        } else {
            answer = __content.userAnswersJSON[0];

            /* Calculating scores.*/
            if(__content.answersJSON[0] === __content.userAnswersJSON[0]){
                score++;
            }
        }   
        
        results = {
            itemUID: interactionId,
            question: __content.questionsJSON[0],
            correctAnswer: __content.answersJSON[0],
            score: score,
            comment: '',
            end_current_test: end_current_test,
            answer: answer,
            possible: 1
        };
        resultArray[0] = results;

        return {
            response: {
                "directions": __content.directionsJSON,
                "results": resultArray
            }
        };    
    }   
    
    return {
        /*Engine-Shell Interface*/
        "init": init, /* Shell requests the engine intialized and render itself. */
        "getStatus": getStatus, /* Shell requests a gradebook status from engine, based on its current state. */
        "getConfig" : getConfig, /* Shell requests a engines config settings.  */
        "handleSubmit" : handleSubmit,
        "showGrades": showGrades,
        "updateLastSavedResults": updateLastSavedResults
    };
    };
});