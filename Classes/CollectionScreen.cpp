//
// Created by ramya on 3/2/17.
//

#include "json/writer.h"
#include "json/stringbuffer.h"

#include "CollectionScreen.h"
#include "PredictionScene.h"
#include "PredictionWebSocket.h"
#include "MappedSprite.h"

USING_NS_CC;

#ifndef PLAYBOOK_API_HOST
#define PLAYBOOK_API_HOST 10.0.2.2
#endif // PLAYBOOK_API_HOST

#ifndef PLAYBOOK_API_PORT
#define PLAYBOOK_API_PORT 8080
#endif // PLAYBOOK_API_PORT

#define STR_VALUE(arg) #arg
#define STR_VALUE_VAR(arg) STR_VALUE(arg)
#define PLAYBOOK_WEBSOCKET_URL "ws://" \
    STR_VALUE_VAR(PLAYBOOK_API_HOST) \
    ":" STR_VALUE_VAR(PLAYBOOK_API_PORT)

//struct type_rect { float  array[4][2]; };
//typedef struct type_rect type_rect;

const int CollectionScreen::NUM_SLOTS = 5;

Scene* CollectionScreen::createScene()
{
    // 'scene' is an autorelease object
    auto scene = Scene::createWithPhysics();
    scene->setName("CollectionScreen");
    //scene->getPhysicsWorld()->setDebugDrawMask(PhysicsWorld::DEBUGDRAW_ALL);

    // 'layer' is an autorelease object
    auto layer = CollectionScreen::create();

    // add layer as a child to scene
    scene->addChild(layer);

    // return the scene
    return scene;
}

// on "init" you need to initialize your instance
bool CollectionScreen::init()
{
    //////////////////////////////
    // 1. super init first
    if ( !Layer::init() )
    {
        return false;
    }
    
    auto visibleSize = Director::getInstance()->getVisibleSize();
    auto winSize = Director::getInstance()->getWinSize();
    Vec2 origin = Director::getInstance()->getVisibleOrigin();
    auto scale =  Director::getInstance()->getContentScaleFactor();

    // Create Node that represents the visible portion of the screen.
    auto node = Node::create();
    this->_visibleNode = node;
    node->setContentSize(visibleSize);
    node->setPosition(origin);
    this->addChild(node);

    // add grass to screen
    auto grass = Sprite::create("Collection-BG-Wood.jpg");
    grass->setPosition(0.0f, 0.0f);
    grass->setAnchorPoint(Vec2(0.0f, 0.0f));
    grass->setScaleX(visibleSize.width / grass->getContentSize().width);
    grass->setScaleY(visibleSize.height / grass->getContentSize().height);
    node->addChild(grass, 0);

    // add banner on top to screen
    auto banner = Sprite::create("Collection-Banner.png");
    auto bannerScale = visibleSize.width / banner->getContentSize().width;
    banner->setPosition(0.0f, visibleSize.height);
    banner->setAnchorPoint(Vec2(0.0f, 1.0f));
    banner->setScaleX(bannerScale);
    banner->setScaleY(bannerScale);
    auto bannerHeight = bannerScale * banner->getContentSize().height;
    node->addChild(banner, 0);

    //add ball tray in the bottom
    auto holder = Sprite::create("Collection-Holder-HandTray.png");
    auto holderScale = visibleSize.width /holder->getContentSize().width;
    holder->setPosition(0.0f, 0.0f);
    holder->setAnchorPoint(Vec2(0.0f, 0.0f));
    holder->setScaleX(holderScale);
    holder->setScaleY(holderScale);
    auto holderHeight = holderScale * holder->getContentSize().height;
    this->_cardsHolder = holder;
    node->addChild(holder, 0);

    //add give to section button
    auto givetosection = Sprite::create("Collection-Button-GiveSection.png");
    auto givetosectionScale = visibleSize.width /givetosection->getContentSize().width;
    givetosection->setPosition(0.0f, visibleSize.height/3.0f);
    givetosection->setAnchorPoint(Vec2(0.0f, 0.0f));
    givetosection->setScaleX(givetosectionScale/2);
    givetosection->setScaleY(givetosectionScale/2);
    auto givetosectionHeight = givetosectionScale * givetosection->getContentSize().height;
    node->addChild(givetosection, 0);

    //add dragtoscore button
    auto dragtoscore = Sprite::create("Collection-Button-ScoreSet.png");
    auto dragtoscoreScale = visibleSize.width /dragtoscore->getContentSize().width;
    dragtoscore->setPosition(visibleSize.width/2.0f, visibleSize.height/3.0f);
    dragtoscore->setAnchorPoint(Vec2(0.0f, 0.0f));
    dragtoscore->setScaleX(dragtoscoreScale/2);
    dragtoscore->setScaleY(dragtoscoreScale/2);
    auto dragtoscoreHeight = dragtoscoreScale * dragtoscore->getContentSize().height;
    node->addChild(dragtoscore, 0);

    //generate a random goal each time

    /* initialize random seed: */
    srand (time(NULL));

    /* generate secret number between 1 and 10: */
    int goal_number = rand() % 15 + 1;
    std::string file_1 ("goal/goal");
    std::string file_2 (std::to_string(goal_number));
    std::string file_3 (".png");
    std::string filename (file_1+file_2+file_3);
    CCLOG("filename:%s",filename.c_str());
    //add goals
    auto goal = Sprite::create(filename);
    auto goalScale = visibleSize.width /goal->getContentSize().width;
    goal->setPosition(visibleSize.width/1.75f, visibleSize.height/1.4f);
    goal->setAnchorPoint(Vec2(0.0f, 0.0f));
    goal->setScaleX(goalScale/3);
    goal->setScaleY(goalScale/3);
    auto goalHeight = goalScale * goal->getContentSize().height;
    node->addChild(goal, 0);

    // Create DrawNode to highlight card slot.
    this->_cardSlotDrawNode = DrawNode::create();
    this->_cardSlotDrawNode->setVisible(false);
    this->_visibleNode->addChild(this->_cardSlotDrawNode, 1);

    this->scheduleUpdate();
    return true;
}

void CollectionScreen::update(float delta) {
    if (!this->_isCardActive && !this->_incomingCardQueue.empty()) {
        auto play = this->_incomingCardQueue.front();
        this->_incomingCardQueue.pop();
        this->receiveCard(play);
    }
}

void CollectionScreen::onResume() {
    CCLOG("CollectionScreen->onResume: Restoring state...");
    PlaybookLayer::onResume();
    //this->restoreState();
    this->connectToServer();
}

void CollectionScreen::onPause() {
    CCLOG("CollectionScreen->onPause: Saving state...");
    //this->saveState();
    PlaybookLayer::onPause();
    this->disconnectFromServer();
}

void CollectionScreen::connectToServer() {
    // Create websocket client.
    auto websocket = PredictionWebSocket::create(PLAYBOOK_WEBSOCKET_URL);

    CCLOG("Connecting to %s", PLAYBOOK_WEBSOCKET_URL);
    websocket->connect();

    websocket->onConnectionOpened = []() {
        CCLOG("Connection to server established");
    };

    websocket->onMessageReceived = [this](std::string message) {
        CCLOG("Message received from server: %s", message.c_str());

        rapidjson::Document document;
        document.Parse(message.c_str());
        if (document.IsObject()) {
            auto eventIterator = document.FindMember("event");
            if (eventIterator == document.MemberEnd()) {
                CCLOGWARN("Received message doesn't contain property \"event\"!");
                return;
            }

            if (!eventIterator->value.IsString()) {
                CCLOGWARN("Property \"event\" is not a string!");
                return;
            }

            std::string eventStr (eventIterator->value.GetString());
            auto dataIterator = document.FindMember("data");
            this->handleServerMessage(eventStr, dataIterator, dataIterator != document.MemberEnd());
        } else {
            CCLOGWARN("Received message is not an object!");
        }
    };

    websocket->onErrorOccurred = [](const cocos2d::network::WebSocket::ErrorCode& errorCode) {
        CCLOG("Error connecting to server: %d", errorCode);
    };

    this->_websocket = websocket;
}

void CollectionScreen::disconnectFromServer() {
    this->_websocket->close();
}

void CollectionScreen::handleServerMessage(const std::string& event,
                                      const rapidjson::Value::ConstMemberIterator& dataIterator,
                                      bool hasData) {
    CCLOG("Handling event from server: \"%s\"", event.c_str());
    if (event == "server:playsCreated") {
        this->handlePlaysCreated(dataIterator, hasData);
    } else {
        CCLOGWARN("Unknown event \"%s\" received from server!", event.c_str());
    }
}

void CollectionScreen::handlePlaysCreated(const rapidjson::Value::ConstMemberIterator& dataIterator,
                                     bool hasData) {
    if (!hasData) {
        CCLOGWARN("Event \"server:playsCreated\" doesn't have data!");
        return;
    }

    if (!dataIterator->value.IsArray()) {
        CCLOG("Event \"server:playsCreated\" has data that's not an array!");
        return;
    }

    auto plays = dataIterator->value.GetArray();
    for (auto it = plays.Begin(); it != plays.End(); ++it) {
        PlaybookEvent::EventType event = PlaybookEvent::intToEvent(it->GetInt());
        CCLOG("Events: %s", PlaybookEvent::eventToString(event).c_str());
        this->_incomingCardQueue.push(event);
    }
}

void CollectionScreen::receiveCard(PlaybookEvent::EventType event)
{
    auto team = PlaybookEvent::getTeam(event);
    if (team == PlaybookEvent::Team::NONE) {
        return;
    }

    std::stringstream cardFileNameSs;
    cardFileNameSs << "cards/Card-";
    switch (team) {
        case PlaybookEvent::Team::FIELDING:
            cardFileNameSs << "F-";
            break;
        case PlaybookEvent::Team::BATTING:
            cardFileNameSs << "B-";
            break;
        default:
            break;
    }

    cardFileNameSs << PlaybookEvent::eventToString(event) << ".jpg";

    auto visibleSize = Director::getInstance()->getVisibleSize();
    auto card = Sprite::create(cardFileNameSs.str());
    auto cardScale = card->getContentSize().width / visibleSize.width * 0.8f;
    card->setPosition(visibleSize.width / 2.0f, visibleSize.height / 2.0f);
    card->setScale(0.0f);
    card->setRotation(RandomHelper::random_real(-5.0f, 5.0f));
    this->_visibleNode->addChild(card, 1);
    this->_isCardActive = true;
    this->_activeCard = card;

    auto fadeIn = FadeIn::create(0.50f);
    auto scaleTo = EaseBackOut::create(ScaleTo::create(0.50f, cardScale));
    auto spawn = Spawn::createWithTwoActions(fadeIn, scaleTo);
    card->runAction(spawn);

    auto listener = EventListenerTouchOneByOne::create();
    listener->onTouchBegan = [this](Touch* touch, Event*) {
        this->startDraggingActiveCard(touch);
        this->_cardSlotDrawNode->setVisible(true);
        return true;
    };

    listener->onTouchMoved = [this](Touch *touch, Event*) {
        auto position = this->_activeCard->getParent()->convertTouchToNodeSpace(touch);
        auto slot = this->getNearestCardSlot(this->_activeCard, position);
        this->_activeCard->setPosition(position);

        // Draw bounding box to show that card can be dropped.
        auto slotRect = this->getCardBoundingBoxForSlot(this->_activeCard, slot);
        this->_cardSlotDrawNode->clear();

        auto slotPosition = this->getCardPositionForSlot(this->_activeCard, slot);
        auto contentScaleFactor = Director::getInstance()->getContentScaleFactor();
        if (slotPosition.distance(position) < 400.0f * contentScaleFactor) {
            this->_cardSlotDrawNode->setLineWidth(6.0f * contentScaleFactor);
            this->_cardSlotDrawNode->drawRect(
                Vec2(slotRect.getMinX(), slotRect.getMinY()),
                Vec2(slotRect.getMaxX(), slotRect.getMaxY()),
                Color4F::ORANGE
            );
        }

        return true;
    };

    listener->onTouchEnded = [this](Touch* touch, Event*) {
        this->stopDraggingActiveCard(touch);
        this->_cardSlotDrawNode->setVisible(false);
        return true;
    };

    card->getEventDispatcher()->addEventListenerWithSceneGraphPriority(listener, card);
}

void CollectionScreen::startDraggingActiveCard(Touch* touch) {
    if (this->_activeCard->getNumberOfRunningActions() == 0) {
        this->_activeCardOrigPosition = this->_activeCard->getPosition();
        this->_activeCardOrigRotation = this->_activeCard->getRotation();
        this->_activeCardOrigScale = this->_activeCard->getScale();
    }

    auto scale = this->getCardScaleInSlot(this->_activeCard);
    auto position = this->_activeCard->getParent()->convertTouchToNodeSpace(touch);

    auto scaleTo = EaseBackOut::create(ScaleTo::create(0.50f, scale));
    auto rotateTo = RotateTo::create(0.50f, 0.0f);
    auto moveTo = MoveTo::create(0.50f, position);

    auto spawn = Spawn::create(scaleTo, rotateTo, moveTo, nullptr);
    auto callFunc = CallFunc::create([this]() {
        this->_isCardActive = false;
    });
    auto sequence = Sequence::create(spawn, callFunc, nullptr);
    this->_activeCard->runAction(sequence);
}

void CollectionScreen::stopDraggingActiveCard(cocos2d::Touch* touch) {
    // Check if touch position is within the slot.
    auto touchVisibleSpace = this->_cardsHolder->getParent()->convertTouchToNodeSpace(touch);
    auto cardsHolderBox = this->_cardsHolder->getBoundingBox();
    if (cardsHolderBox.containsPoint(touchVisibleSpace)) {
        this->getNearestCardSlot(this->_activeCard, touchVisibleSpace);
        CCLOG("Drop card in slot");
    }

    auto scaleTo = EaseBackOut::create(ScaleTo::create(0.50f, this->_activeCardOrigScale));
    auto rotateTo = RotateTo::create(0.50f, this->_activeCardOrigRotation);
    auto moveTo = MoveTo::create(0.50f, this->_activeCardOrigPosition);
    auto spawn = Spawn::create(scaleTo, rotateTo, moveTo, nullptr);
    this->_activeCard->runAction(spawn);
}

float CollectionScreen::getCardScaleInSlot(Node* card) {
    // Account for the left and right green sides (54px each).
    auto cardsHolderWidth = (this->_cardsHolder->getContentSize().width - 54.0f) * this->_cardsHolder->getScale();
    return cardsHolderWidth / card->getContentSize().width / NUM_SLOTS;
}

Vec2 CollectionScreen::getCardPositionForSlot(Node* card, int slot) {
    // All target dimensions are in the visible's node space.
    auto cardScale = this->getCardScaleInSlot(card);

    // Compute positions.
    auto scaledCardContentSize = card->getContentSize() * cardScale;
    Vec2 position (
        this->_cardsHolder->getPosition().x + (slot + 0.5f) * scaledCardContentSize.width + (27.0f * this->_cardsHolder->getScale()),
        this->_cardsHolder->getPosition().y + scaledCardContentSize.height * 0.5f + (27.0f * this->_cardsHolder->getScale())
    );

    return position;
}

Rect CollectionScreen::getCardBoundingBoxForSlot(Node* card, int slot) {
    Rect box;
    auto position = this->getCardPositionForSlot(card, slot);
    box.origin = position - Vec2(
        card->getContentSize().width * card->getScale() / 2.0f,
        card->getContentSize().height * card->getScale() / 2.0f
    );
    box.size = card->getContentSize() * card->getScale();
    return box;
}

int CollectionScreen::getNearestCardSlot(Node* card, const Vec2& position) {
    int slot = 0;
    float smallestDistance = FLT_MAX;

    for (int i = 0; i < NUM_SLOTS; ++i) {
        auto slotPosition = this->getCardPositionForSlot(card, i);
        auto distance = slotPosition.distance(position);
        if (distance < smallestDistance) {
            slot = i;
            smallestDistance = distance;
        }
    }

    return slot;
}
