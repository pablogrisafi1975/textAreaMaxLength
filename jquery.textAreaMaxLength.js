//decent browser use \n as newline inside textarea
//IE of course uses \r\n.
//since most users still use IE, i'm normalizing to IE
//that is to say, I will make everything think that
//newline is always \r\n

	/*
	options: {
		'maxLength': integer > 0, if ommitted will use maxlength value on html, if none is present will use 200
		'showCharsCount': boolean, default false;
		'charsCountMessage': string, something like 'You have written {written} chars, you can write {maxLength} chars, you have {left} chars left'
		Is not a template language, just a simple search and replace. default value is '{written}/{maxLength}'
	}
	
	*/

(function($){
	$.fn.textAreaMaxLength = function( options ) {  
		return this.each(function() {
			if(this.tagName && this.tagName.toLowerCase() == 'textarea'){
				var $this = $(this);
				var maxLengthHtml = parseInt($this.attr('maxlength'), 10);
				if(maxLengthHtml < 1 || isNaN(maxLengthHtml)){
					maxLengthHtml = 200;
				}			
				var settings = $.extend( {
				  'maxLength'         : maxLengthHtml,
				  'showCharsCount' : false,
				  'charsCountMessage': '{written}/{maxLength}'
				}, options);				
				fixTextAreaMaxLength(this, $this, settings);
			}		
		});
	};
	

	
	function fixTextAreaMaxLength(textarea, $textarea, options){
		//console.log('options.maxLength:' + options.maxLength + ' options.showCharsCount:' + options.showCharsCount + ' options.charsCountMessage:' + options.charsCountMessage);
		if(options.showCharsCount){
			$textarea.after("<div id='" + textarea.id + "_charsCount' class='charsCount'>" + createCharsCountMessage() + "</div>");
			var $charsCountDiv = jQuery('#' + textarea.id + '_charsCount');
		}
		
		$textarea.keydown(function(event){
			if(event.which >= 112 && event.which <= 126){
				return; //F1 to F12
			}
			if(event.which >= 35 && event.which <= 40){
				return; //begin, end, arrows
			}
			if(event.which == 8 || event.which == 9 || event.which == 27 || event.which == 45 || event.which == 46){
				return; //backspace, tab, escape, insert, delete
			} 
			if(event.ctrlKey || event.altKey){
				return; //mostly for ctrl-A, ctrl-C, ctrl-V, ctrl-X, and alt-whatever
			}
			
			//newline enters 2 chars, line feed and carrier return
			var currentValue = getCurrentValue();
			if(currentValue.length >= options.maxLength || (event.which == 13 &&  currentValue.length >= options.maxLength -1)){
				if(getSelectedText().length == 0  && !isOverwriteEnabled()){
					event.preventDefault();
				}
			}	
		});			
			
		//only works for IE, since FF/Chrome does not allow access to clipboard data
		if(window.clipboardData){
			$textarea.bind('paste', function (event){
				var originalPasteText =  window.clipboardData.getData('Text');
				var currentText = getCurrentValue();
				var selectedText = getSelectedText();					
				if(currentText.length - selectedText.length + originalPasteText.length > options.maxLength){	
					event.preventDefault();				
					var newPasteTextLength = options.maxLength - (currentText.length - selectedText.length);
					var newPasteText;
					if(newPasteTextLength > 0){
						newPasteText = originalPasteText.substr(0, newPasteTextLength);
					}else{
						newPasteText = '';
					}
					var selection = getSelection();
					var before = currentText.substr(0 , selection.start);
					var after = currentText.substr(selection.end);
					textarea.value = before + newPasteText + after;
					setTimeout(function(){
						setCaretPosition( before.length + newPasteText.length);
						}, 1);
				}	
			});
		}			
		
		//almost last resource for firefox/chrome
		$textarea.bind('input', function(){
			truncate();
			updateCharsCount();
		});
		
	
		//almost last resource for IE
		$textarea.bind('propertychange', function(event){
			if(event.originalEvent.propertyName == 'value'){
				truncate();
				updateCharsCount();
			}				
		});
		
		//last resource
		$textarea.blur(function(event){
			truncate();
			updateCharsCount();
		});
		
		function createCharsCountMessage(){
			var curentValue = getCurrentValue();
			var message = options.charsCountMessage
				.replace(/{maxLength}/g, options.maxLength)
				.replace(/{written}/g, curentValue.length)
				.replace(/{left}/g, options.maxLength - curentValue.length);
			return htmlEscape(message);
		
		}
		
		function htmlEscape(str) {
			return String(str)
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		}
		//newlines will always be \r\n
		function getCurrentValue(){
			return textarea.value.replace( /\r?\n/g, "\r\n");		
		}	
		
		function getSelectedText() {
			var text = ''; //IE
			if (document.selection != undefined){
				textarea.focus();
				var sel = document.selection.createRange();
				text = sel.text;
			}
			// FF/Chrome
			else if (textarea.selectionStart != undefined)	{
				var startPos = textarea.selectionStart;
				var endPos = textarea.selectionEnd;
				text = textarea.value.substring(startPos, endPos);
			}			
			return text;
		}		
				
				
		//horrible list of workarounds to handle IE collection of bugs
		function getSelection() {
			var start = 0, end = 0, normalizedValue, range,	textInputRange, len, endRange;

			if (typeof textarea.selectionStart == "number" && typeof textarea.selectionEnd == "number") {
				start = textarea.selectionStart;
				end = textarea.selectionEnd;
			} else {
				range = document.selection.createRange();

				if (range && range.parentElement() == textarea) {
					len = textarea.value.length;
					normalizedValue = textarea.value.replace(/\r\n/g, "\n");

					// Create a working TextRange that lives only in the input
					textInputRange = textarea.createTextRange();
					textInputRange.moveToBookmark(range.getBookmark());

					// Check if the start and end of the selection are at the very end
					// of the input, since moveStart/moveEnd doesn't return what we want
					// in those cases
					endRange = textarea.createTextRange();
					endRange.collapse(false);

					if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
						start = end = len;
					} else {
						start = -textInputRange.moveStart("character", -len);
						start += normalizedValue.slice(0, start).split("\n").length - 1;

						if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
							end = len;
						} else {
							end = -textInputRange.moveEnd("character", -len);
							end += normalizedValue.slice(0, end).split("\n").length - 1;
						}
					}
				}
			}

			return {
				start: start,
				end: end
			};
		}				

		function setCaretPosition(pos){
			textarea.focus();
			if(textarea.setSelectionRange){					
				textarea.setSelectionRange(pos,pos);
			}else if (textarea.createTextRange) {
				var range = textarea.createTextRange();
				range.collapse(true);
				for(var i = 0; i < pos; i++){
					if(textarea.value.charCodeAt(i) == 13){
						i++;
					}
					range.move('character', 1);
				}
				range.select();
			}
		}
				
		function truncate(){
			var value = getCurrentValue();
			if(value.length > options.maxLength){
				var selection = getSelection();
				textarea.value = value.substr(0, options.maxLength);	
				if(selection.end < options.maxLength){
					setCaretPosition( selection.end);					
				}
			}
		}
		
		function isOverwriteEnabled() {
			try {
				// try the MSIE way
				return document.queryCommandValue("OverWrite");
			} catch (ex) {
				// not MSIE => not supported
				return false;
			}
		}		

		function updateCharsCount(){
			if(options.showCharsCount){
				$charsCountDiv.text(createCharsCountMessage());
			}
		}			
		
	};
	
	

	
})( jQuery );


