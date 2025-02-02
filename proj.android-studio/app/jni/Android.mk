LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

$(call import-add-path,$(LOCAL_PATH)/../../../cocos2d)
$(call import-add-path,$(LOCAL_PATH)/../../../cocos2d/external)
$(call import-add-path,$(LOCAL_PATH)/../../../cocos2d/cocos)
$(call import-add-path,$(LOCAL_PATH)/../../../cocos2d/cocos/audio/include)

LOCAL_MODULE := MyGame_shared

LOCAL_MODULE_FILENAME := libMyGame

LOCAL_SRC_FILES := hellocpp/main.cpp \
                   ../../../Classes/AppDelegate.cpp \
                   ../../../Classes/RootScene.cpp \
                   ../../../Classes/PredictionScene.cpp \
                   ../../../Classes/SectionSelectionScene.cpp \
				   ../../../Classes/SectionScoreScene.cpp \
                   ../../../Classes/CollectionScreen.cpp \
                   ../../../Classes/MappedSprite.cpp \
                   ../../../Classes/PlaybookEvent.cpp \
                   ../../../Classes/BlurFilter.cpp \
                   ../../../Classes/PredictionWebSocket.cpp

LOCAL_C_INCLUDES := $(LOCAL_PATH)/../../../Classes

# _COCOS_HEADER_ANDROID_BEGIN
# _COCOS_HEADER_ANDROID_END


LOCAL_STATIC_LIBRARIES := cocos2dx_static

# _COCOS_LIB_ANDROID_BEGIN
# _COCOS_LIB_ANDROID_END

include $(BUILD_SHARED_LIBRARY)
include $(LOCAL_PATH)/../../../cocos2d/gpg-cpp-sdk/android/Android.mk

$(call import-module,.)

# _COCOS_LIB_IMPORT_ANDROID_BEGIN
# _COCOS_LIB_IMPORT_ANDROID_END
