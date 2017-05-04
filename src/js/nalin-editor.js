/*
 * -------------------
 * Engine Module Editor
 * -------------------
 * 
 * Item Type: MCQ Single Choice Quesion engine
 * Code: MCQ
 * Interface: Editor
 *  
 * Interfaces / Modes :->
 * 
 *  1. Supports Standard ENGINE-SHELL interface
 *      {
 *          init(),
 *          getStatus(),
 *          getConfig()
 *      }
 * 
 * ENGINE-EDITOR - SHELL interface : ->
 * 
 * This "engine editor" loaded by another module/js "shell.js" which  establishes interface with the platform. The shell instantiates
 * this engine [ engine.init() ]  with necessary configuration paramters and a reference to platform Adapter
 * object which allows subsequent communuication with the platform.
 *
 *
 * SHELL calls engine.getConfig() to request SIZE information - the response from the engine is 
 * used to resize the container iframe.
 *
 * 
 * EXTERNAL JS DEPENDENCIES : ->
 * Following are shared/common dependencies and assumed to loaded via the platform. The engine code can use/reference
 * these as needed
 * 1. JQuery (2.1.1) 
 * 2. Boostrap  (TODO: version)
 * 3. Rivets (0.9.6)
 */

define(['text!../html/mcq-editor.html', //Layout of the Editor
        'css!../css/mcq-editor.css', //Custom CSS of the Editor
        'jquery-ui', //Jquery Sortable for reordering
        'css!../../bower_components/jquery-ui/themes/base/jquery-ui.css', //CSS for sortable
        'rivets',   // Rivets for two way data binding
        'sightglass' // Required by Rivets
        ], function (mcqTemplateRef) {

    mcqEditor = function() {
    "use strict";
        
    /*
     * Reference to platform's activity adaptor (initialized during init() ).
     */
    var activityAdaptor;     
    
    /*
     * Internal Engine Config.
     */ 
    var __config = {
        RESIZE_MODE: "auto", /* Possible values - "manual"/"auto". Default value is "auto". */
        RESIZE_HEIGHT: "580" /* Applicable, if RESIZE_MODE is manual. If RESIZE_HEIGHT is defined in TOC then that will overrides. */
        /* If both config RESIZE_HEIGHT and TOC RESIZE_HEIGHT are not defined then RESIZE_MODE is set to "auto"*/
    };
    
    /*
     * Internal Engine State.
     */ 
    var __state = {
       "hasUnsavedChanges" : false
    };  
    
    /*
     * Constants 
     */
    var __constants = {
        /* CONSTANT for HTML selectors - defined in the layout */ 
        DOM_SEL_ACTIVITY_BODY: ".activity-body",
        
        /* CONSTANT for identifier in which Adaptor Instance will be stored */
        ADAPTOR_INSTANCE_IDENTIFIER: "data-objectid",
        
        TEMPLATES: {
            /* Regular MCQ Layout */
            MCQ_EDITOR: mcqTemplateRef
        }
    };
    
    var __editedJsonContent;
    var __parsedQuestionArray = [];
    // Array of all interactions Ids in question
    var __interactionIds = [];
    // Array of all interaction tags in question
    var __interactionTags = [];
    var __finalJSONContent = {};
    var __quesEdited = {};
    __quesEdited.isEditing = false;
        
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
        __editedJsonContent = jQuery.extend(true, {}, jsonContentObj);

        /* ------ VALIDATION BLOCK START -------- */    
        if (__editedJsonContent.content === undefined) {
            /* Inform the shell that init is complete */
            if(callback) {
                callback();
            }           
            //TODO - In future more advanced schema validations could be done here    
            return; /* -- EXITING --*/
        }

        // Process JSON to remove interaction tags and initiate __interactionIds and __interactionTags Arrays
        //__parseAndUpdateJSONForInteractions();
        __parseAndUpdateJSONForInteractions();

        //Process JSON for easy iteration in template
        //__parseAndUpdateJSONForRivets();
        __parseAndUpdateJSONForRivets();
        /* ------ VALIDATION BLOCK END -------- */        
    
        /* Apply the layout HTML to the dom */      
        $(elRoot).html(__constants.TEMPLATES[htmlLayout]);

        /* Initialize RIVET. */
        __initRivets();

        /* ---------------------- SETUP EVENTHANDLER STARTS----------------------------*/
        //On CLICK of Radio buttons    
        $(document).on('change', '.editor .radio input:radio', __handleRadioButtonClick);
        
        //Drag of list items (re-ordering)
        __bindSortable();
        /* ---------------------- SETUP EVENTHANDLER ENDS------------------------------*/

        /* Inform the shell that init is complete */
        if(callback) {
            callback();
        }                               
      
    } /* init() Ends. */        
    
    /* ---------------------- ENGINE-SHELL Interface ---------------------------------*/
    /**
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
        return __state.hasUnsavedChanges;
    }
            
    /**
     * ENGINE-SHELL Interface
     *
     * Return the current state (Activity Submitted/ Partial Save State.) of activity.
     */
    function saveItemInEditor(){
        activityAdaptor.submitEditChanges(__transformJSONtoOriginialForm());
    }

    /* ---------------------- ENGINE-SHELL Interface ends ---------------------------------*/
           

    /* ---------------------- JSON PROCESSING FUNCTIONS START ---------------------------------*/

    /***
     * This function does following
     * 1. Creates two arrays required for rendering this editor
     *      1.1 __interactionIds (InteractionIds array) - This contains all the interaction ids (in questiondata)
     *           e.g. ["i1", "i2"]
     *      1.2 __interactionTags (Array of Original interaction texts in questiondata) - This will be used for recreating JSON to original format when "saveItemInEditor" is called.  
     *          e.g. [
     *             "<a href='http://www.comprodls.com/m1.0/interaction/mcqsc'>i1</a>", 
     *             "<a href='http://www.comprodls.com/m1.0/interaction/mcqsc'>i2</a>"
     *              ]   
     * 2. Replace the interactionTags in questiondata (__editedJsonContent Object) with BLANKs 
     **/ 
    function __parseAndUpdateJSONForInteractions(){
        var newArray =[];
        var newObj={};
        var interactionTag;
        for(var i=0; i <__editedJsonContent.content.canvas.data.questiondata.length; i++){
            __parsedQuestionArray = $.parseHTML(__editedJsonContent.content.canvas.data.questiondata[i].text);
            var interactionReferenceString = "http://www.comprodls.com/m1.0/interaction/mcq";
            $.each(__parsedQuestionArray, function(index, el) {
              if(this.href === interactionReferenceString) {
                __interactionIds.push(this.childNodes[0].nodeValue.trim())
                interactionTag = this.outerHTML;
                interactionTag = interactionTag.replace(/"/g, "'");
                __interactionTags.push(interactionTag);
                __editedJsonContent.content.canvas.data.questiondata[i].text = __editedJsonContent.content.canvas.data.questiondata[i].text.replace(interactionTag, '');
              }
            });
        }
        for(var key in __editedJsonContent.content.interactions){
            newObj = __editedJsonContent.content.interactions[key];
            newObj.key = key;
            newArray.push(newObj);
        }
        __editedJsonContent.content.interactions = newArray;
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
    function __parseAndUpdateJSONForRivets(){
        for(var i=0; i <__interactionIds.length; i++){
           var processedArray = [];
           __editedJsonContent.content.interactions[i].MCQ.forEach(function(obj, index){
                var processedObj = {};
                processedObj.customAttribs = {};
                Object.keys(obj).forEach(function(key){
                    processedObj.customAttribs.key = key;
                    processedObj.customAttribs.value = obj[key];
                    processedObj.customAttribs.isEdited = false;
                    processedObj.customAttribs.index = index;
                    if(__editedJsonContent.responses[__interactionIds[i]].correct == processedObj.customAttribs.key){
                        processedObj.customAttribs.isCorrect = processedObj.customAttribs.value;
                    } else{
                        processedObj.customAttribs.isCorrect = false;
                    }
                });
                processedArray.push(processedObj);
            });
            __editedJsonContent.content.interactions[i].MCQ = processedArray; 
        }
    }

    
            
    /*------------------------RIVET INITIALIZATION & BINDINGS -------------------------------*/        
    function __initRivets(){
        /*
         * Formatters for rivets
         */

         /* Appends cutom arguments to function calls*/
        rivets.formatters.args = function(fn){
          var args = Array.prototype.slice.call(arguments, 1);
          return function()  {
            return fn.apply(this, Array.prototype.concat.call(arguments, args))
          }
        }

        rivets.formatters.appendindex = function(obj, index) {
            var array = [];
            array.push(obj[index])
            return array;
        };

        /* 
         * Bind data to template using rivets
         */
        rivets.bind($('#mcq-editor'), {
            content: __editedJsonContent.content, 
            toggleEditing: __toggleEditing, 
            toggleQuestionTextEditing: __toggleQuestionTextEditing, 
            quesEdited: __quesEdited,
            removeItem: __removeItem,
            addItem: __addItem,
            removeEditing : __removeEditing,
            interactionIds : __interactionIds
        });
    }

    /* Toggle between editing and read-only mode for question text */
    function __toggleQuestionTextEditing(event, element){
        element.isEditing = !element.isEditing;
        $(event[0].currentTarget).siblings('.question-text-editor').focus();
    }

    /* Toggle between editing and read-only mode for options */
    function __toggleEditing(event, element){
        element.customAttribs.isEdited = !element.customAttribs.isEdited;
        $(event[0].currentTarget).parent().find('.option-value')[0].focus();
    }

    /* Remove option item */
    function __removeItem(event, element, interaction){
        __editedJsonContent.content.interactions[interaction].MCQ.splice(element.customAttribs.index,1);
        for(var option=element.index; option<__editedJsonContent.content.interactions[interaction].MCQ.length; option++){
            obj.interactions[interaction].MCQ[option].customAttribs.index--;
        }
        __state.hasUnsavedChanges = true;
        activityAdaptor.itemChangedInEditor(__transformJSONtoOriginialForm());
    }

    /* Remove editing on blur*/
    function __removeEditing(event, element){
        if(element.customAttribs){
            element.customAttribs.isEdited = false;    
        } else{
            element.isEditing = false;
        }
        __state.hasUnsavedChanges = true;
        activityAdaptor.itemChangedInEditor(__transformJSONtoOriginialForm());
    }

    /* Add new option for the question */
    function __addItem(event, content, interaction){
        var newObj = {};
        newObj.customAttribs = {};
        newObj.customAttribs.key = __guid();
        newObj.customAttribs.value = "";
        newObj.customAttribs.isEdited = true;
        newObj.customAttribs.index = content.interactions[interaction].MCQ.length;
        content.interactions[interaction].MCQ.push(newObj);
        __state.hasUnsavedChanges = true;
        activityAdaptor.itemChangedInEditor(__transformJSONtoOriginialForm());
    }
    /*------------------------RIVETS END-------------------------------*/

    /* ---------------------- JQUERY BINDINGS ---------------------------------*/
    /* Handling when options are sorted.
     * When dargging is stopped, get the previous and new index for dragged element.
     * Now instead of sortable, use these indexes to restructure array.
     * when the array would be updated, the rivets will detect the change and re-render
     * updated data in the template.
     */
    function __bindSortable(){
        $(".sortable").sortable({
            handle: ".drag-icon",
            axis: 'y',
            containment: '.main-container',
            stop: function( event, ui ) {
                var prevIndex = $(ui.item[0]).attr('elementIndex');
                var currentIndex;
                var interaction;
                var interactIndex;
                /* Find the previous and current index of dragged element*/
                $(ui.item[0]).parent('.sortable').children('li').each(function(index){
                    if($(this).attr('elementIndex') == prevIndex){
                        currentIndex = index;
                        interactIndex = parseInt($(this).attr('interactIndex'));
                        return false;
                    }
                });
                
                prevIndex = parseInt(prevIndex);
                /* Cancel sorting using library*/
                $(".sortable").sortable("cancel");

                /* Instead do the sorting manually*/
                var removedItem = __editedJsonContent.content.interactions[interactIndex].MCQ.splice(prevIndex, 1);
                __editedJsonContent.content.interactions[interactIndex].MCQ.splice(currentIndex,0,removedItem[0]);
                
                /* Update index property of customAttribs for each element*/
                $.each(__editedJsonContent.content.interactions[interactIndex].MCQ, function(index, value){
                    __editedJsonContent.content.interactions[interactIndex].MCQ[index].customAttribs.index = index;
                });
                
                __state.hasUnsavedChanges = true;
                activityAdaptor.itemChangedInEditor(__transformJSONtoOriginialForm());
            } 
        });
    }
    
    function __handleRadioButtonClick(event){
        var currentTarget = event.currentTarget;
        var quesIndex = 0;
        var interactionIndex = parseInt($(currentTarget).parent().parent("li").attr('interactIndex'));
        $("label.radio").parent().removeClass("highlight");
        $(currentTarget).parent().parent("li").addClass("highlight"); 
        $('.correct-answer').hide();
        $(currentTarget).siblings('.correct-answer').show();
        __state.hasUnsavedChanges = true;
        /* Update the isCorrect property for each option*/
        __editedJsonContent.content.interactions[interactionIndex].MCQ.forEach(function(obj, index){
            if(__editedJsonContent.content.interactions[interactionIndex].MCQ[index].customAttribs.key ==  $(currentTarget).attr('key')){
                __editedJsonContent.content.interactions[interactionIndex].MCQ[index].customAttribs.isCorrect = true;
            } else{
                __editedJsonContent.content.interactions[interactionIndex].MCQ[index].customAttribs.isCorrect = false;
            }
        });
        __editedJsonContent.responses[__interactionIds[interactionIndex]].correct = $(currentTarget).attr('key');
        activityAdaptor.itemChangedInEditor(__transformJSONtoOriginialForm());
    }

    /* Transform the processedJSON to originally received form so that the platform
     * can use it to repaint the updated json.
     */
    function __transformJSONtoOriginialForm(){
        __finalJSONContent = jQuery.extend(true, {}, __editedJsonContent);
        var newObj = {};
        for(var interaction=0;interaction <__finalJSONContent.content.interactions.length; interaction++){
            var content = __finalJSONContent.content.interactions[interaction];
            for(var option=0;option<content.MCQ.length;option++){
                content.MCQ[option][content.MCQ[option].customAttribs.key] = content.MCQ[option].customAttribs.value;
                delete content.MCQ[option].customAttribs;
            }
            newObj[content.key] = content;  
            delete newObj[content.key].key;
        }
        __finalJSONContent.content.interactions = newObj;
        for(var i=0;i <__finalJSONContent.content.canvas.data.questiondata.length; i++){
            __finalJSONContent.content.canvas.data.questiondata[i].text += __interactionTags[i];
        }
        return __finalJSONContent;
    }    
    /* ---------------------- JQUERY BINDINGS END ----------------------------*/

    /* Generate unique ids for newly added options*/
    function __guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
    
    return {
        /*Engine-Shell Interface*/
        "init": init, /* Shell requests the engine intialized and render itself. */
        "getStatus": getStatus, /* Shell requests a gradebook status from engine, based on its current state. */
        "getConfig" : getConfig, /* Shell requests a engines config settings.  */
        "saveItemInEditor" : saveItemInEditor
    };
    };
});
